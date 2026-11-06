// Public, aggregated survey evidence. No household microdata is downloaded or shipped.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SURVEYS = [2013, 2018];
export const INDICATORS = {
	electricityAccess: {
		id: 'HC_ELEC_P_ELC',
		definition: 'Share of the de jure population living in households with electricity.',
		unit: 'share',
		caveat: 'Access does not measure supply hours, reliability or generating capacity.'
	},
	primaryAttendance: {
		id: 'ED_NARP_B_BTH',
		definition: 'Share of primary-school-age children attending primary school (net attendance).',
		unit: 'share',
		caveat: 'Not adult literacy, school quality or attendance in every form of education.'
	}
};

export const surveyUrl = (year) =>
	`https://api.dhsprogram.com/rest/dhs/data?surveyIds=NG${year}DHS&indicatorIds=HC_ELEC_P_ELC,ED_NARP_B_BTH&breakdown=all&perpage=1000&f=json`;

const optionalNumber = (v) => (v === '' || v == null ? null : Number(v));
const stateId = (label) => {
	const name = label.replace(/^\.\./, '').trim();
	return (
		{ 'FCT Abuja': 'fct', Nasarawa: 'nassarawa' }[name] ?? name.toLowerCase().replaceAll(' ', '-')
	);
};

/** Validate survey grain and build dated state observations; fail closed on missing data. */
export function buildDevelopment(responses, cells) {
	const snapshots = [];
	const years = new Set();
	for (const response of responses) {
		if (response.TotalPages !== 1 || !response.Data?.length)
			throw new Error('Incomplete DHS API page response');
		const year = response.Data[0].SurveyYear;
		if (years.has(year)) throw new Error(`Duplicate survey year ${year}`);
		years.add(year);
		const snapshot = { year, surveyId: `NG${year}DHS`, national: {}, cells: {} };
		for (const row of response.Data) {
			if (
				row.SurveyId !== snapshot.surveyId ||
				row.SurveyYear !== year ||
				row.DHS_CountryCode !== 'NG'
			)
				throw new Error('Mixed DHS surveys or countries');
			const key = Object.keys(INDICATORS).find((k) => INDICATORS[k].id === row.IndicatorId);
			if (!key) continue;
			let target;
			if (row.CharacteristicCategory === 'Total' && row.CharacteristicLabel === 'Total')
				target = snapshot.national;
			else if (
				row.CharacteristicCategory === 'Region' &&
				row.CharacteristicLabel.startsWith('..')
			) {
				const id = stateId(row.CharacteristicLabel);
				if (!cells.some((c) => c.id === id))
					throw new Error(`Unknown DHS state ${row.CharacteristicLabel}`);
				target = snapshot.cells[id] ??= {};
			} else continue; // Zones, wealth and residence are different grains, never additional states.
			if (target[key]) throw new Error(`Duplicate ${key} in ${year}`);
			if (
				typeof row.Value !== 'number' ||
				!Number.isFinite(row.Value) ||
				row.Value < 0 ||
				row.Value > 100
			)
				throw new Error(`Invalid percentage value for ${key} in ${year}`);
			target[key] = {
				value: row.Value / 100,
				denominatorWeighted: optionalNumber(row.DenominatorWeighted),
				denominatorUnweighted: optionalNumber(row.DenominatorUnweighted),
				ciLow: optionalNumber(row.CILow) === null ? null : Number(row.CILow) / 100,
				ciHigh: optionalNumber(row.CIHigh) === null ? null : Number(row.CIHigh) / 100
			};
		}
		for (const id of ['national', ...cells.map((c) => c.id)]) {
			const values = id === 'national' ? snapshot.national : snapshot.cells[id];
			for (const key of Object.keys(INDICATORS))
				if (!values?.[key]) throw new Error(`Missing ${key} for ${id} in ${year}`);
		}
		snapshots.push(snapshot);
	}
	return {
		schemaVersion: 1,
		indicators: INDICATORS,
		snapshots: snapshots.sort((a, b) => a.year - b.year),
		sources: snapshots.map((s) => ({
			name: `National Population Commission / ICF — Nigeria DHS ${s.year}, STATcompiler API`,
			url: surveyUrl(s.year),
			licence: 'DHS API terms of use; acknowledge NPC, ICF and The DHS Program',
			files: ['development.json'],
			surveyId: s.surveyId
		}))
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
	const data = buildDevelopment(
		SURVEYS.map((y) => read(`./.cache/dhs-development-${y}.json`)),
		read('../../src/lib/game/sim/data/cells.json')
	);
	writeFileSync(
		new URL('../../src/lib/game/sim/data/development.json', import.meta.url),
		JSON.stringify(data) + '\n'
	);
	console.log(
		`Development: ${data.snapshots.length} surveys × ${Object.keys(data.snapshots[0].cells).length} states × 2 indicators`
	);
}
