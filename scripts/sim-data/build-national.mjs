// Builds src/lib/game/sim/data/national.json: Nigeria's real series aligned to years 1850–2100.
// Gaps between real points are interpolated linearly; nothing is extrapolated (null outside the data),
// except population, which uses the long-run series before 1950 and UN projections after the last estimate.
import { readFileSync, writeFileSync } from 'node:fs';

const CACHE = new URL('./.cache/', import.meta.url);
const OUT = new URL('../../src/lib/game/sim/data/national.json', import.meta.url);
const FIRST = 1850;
const LAST = 2100;
export const YEARS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);

/** Reads an OWID CSV and returns Map<year, number> for one country (Nigeria by default) from the given column. */
export function owidSeries(csv, column, code = 'NGA') {
	const [header, ...rows] = csv.trim().split('\n');
	const cols = header.split(',');
	const ci = cols.indexOf(column);
	if (ci < 0) throw new Error(`column ${column} not in ${cols.join(',')}`);
	const out = new Map();
	for (const row of rows) {
		const f = row.split(',');
		if (f[1] !== code || f[ci] === '') continue;
		out.set(Number(f[2]), Number(f[ci]));
	}
	return out;
}

/** Linear interpolation inside the known range; null outside it. */
export function align(series, scale = 1) {
	const known = [...series.keys()].sort((a, b) => a - b);
	return YEARS.map((y) => {
		if (series.has(y)) return round(series.get(y) * scale);
		const lo = known.findLast((k) => k < y);
		const hi = known.find((k) => k > y);
		if (lo === undefined || hi === undefined) return null;
		const t = (y - lo) / (hi - lo);
		return round((series.get(lo) * (1 - t) + series.get(hi) * t) * scale);
	});
}

const round = (n) => Math.round(n * 1000) / 1000;
// Compared first: a Nigerian audience knows these best. Others only when no African country is close.
const AFRICA = [
	'Egypt',
	'South Africa',
	'Morocco',
	'Ghana',
	"Côte d'Ivoire",
	'Senegal',
	'Algeria',
	'Tunisia',
	'Botswana',
	'Gabon',
	'Angola',
	'Tanzania',
	'Uganda',
	'Benin',
	'Kenya',
	'Cameroon',
	'Ethiopia',
	'Niger'
];
const PEERS = {
	'the United States': 'USA',
	Germany: 'DEU',
	'South Korea': 'KOR',
	'the UK': 'GBR',
	Japan: 'JPN',
	Turkey: 'TUR',
	Malaysia: 'MYS',
	Russia: 'RUS',
	China: 'CHN',
	Mexico: 'MEX',
	Brazil: 'BRA',
	Egypt: 'EGY',
	Indonesia: 'IDN',
	'South Africa': 'ZAF',
	Morocco: 'MAR',
	Vietnam: 'VNM',
	India: 'IND',
	Pakistan: 'PAK',
	Bangladesh: 'BGD',
	Ghana: 'GHA',
	"Côte d'Ivoire": 'CIV',
	Senegal: 'SEN',
	Algeria: 'DZA',
	Tunisia: 'TUN',
	Botswana: 'BWA',
	Gabon: 'GAB',
	Angola: 'AGO',
	Tanzania: 'TZA',
	Uganda: 'UGA',
	Benin: 'BEN',
	Kenya: 'KEN',
	Cameroon: 'CMR',
	Ethiopia: 'ETH',
	Niger: 'NER'
};
const read = (f) => readFileSync(new URL(f, CACHE), 'utf8');

// Nigeria's neighbours and the countries its grid line reaches through Benin and Togo (West African Power Pool).
const NEIGHBOURS = ['BEN', 'NER', 'TCD', 'CMR', 'TGO', 'GHA'];

// Our Nigeria's exports of goods in 2011 US dollars (US CPI: 1950 24.1, 1960 29.6, 2011 224.9, 2022 292.7).
// 1950 and 1960: domestic exports £88.5M and £165.6M at $2.80 (Helleiner 1966, Peasant Agriculture,
// Government and Economic Growth in Nigeria, statistical appendix); oil 2.7% and tin about 3% in 1960, the
// rest farm goods. 2022: merchandise exports about $63B (WTO), oil and gas about 88%, farm goods about 4%,
// manufactures about 5% (NBS foreign trade reports). Rounded; the shares are approximate.
const EXPORT_ANCHORS = {
	1950: { total: 2.31e9, oil: 0, farm: 0.9, goods: 0.02 },
	1960: { total: 3.52e9, oil: 0.03, farm: 0.85, goods: 0.03 },
	2022: { total: 48.4e9, oil: 0.88, farm: 0.04, goods: 0.05 }
};

if (import.meta.url === `file://${process.argv[1]}`) {
	const popLong = owidSeries(read('pop-long.csv'), 'population_historical');
	const unEst = owidSeries(read('pop-un.csv'), 'population__sex_all__age_all__variant_estimates');
	const unProj = owidSeries(
		read('pop-un.csv'),
		'population__sex_all__age_all__variant_medium__projected'
	);
	const pop = new Map([...popLong, ...unEst, ...unProj]);

	const national = {
		years: YEARS,
		pop: align(pop),
		lifeExp: align(owidSeries(read('life-expectancy.csv'), 'life_expectancy_0')),
		litSchool: align(owidSeries(read('literacy.csv'), 'literacy_rate'), 0.01),
		urban: align(
			owidSeries(read('urban.csv'), 'share__area_type_urban__data_type_estimates'),
			0.01
		),
		gdpPc: align(owidSeries(read('gdp-pc.csv'), 'gdp_per_capita')),
		// The world's income frontier: the richer of the UK and the US each year (the UK until about 1900).
		frontierGdpPc: ((uk, us) =>
			uk.map((v, i) => (v == null || us[i] == null ? (v ?? us[i]) : Math.max(v, us[i]))))(
			align(owidSeries(read('gdp-pc.csv'), 'gdp_per_capita', 'GBR')),
			align(owidSeries(read('gdp-pc.csv'), 'gdp_per_capita', 'USA'))
		),
		// Well-known countries' income in the last data year, for "as rich as China today".
		peers: (() => {
			const csv = read('gdp-pc.csv');
			const at = (code) => [...owidSeries(csv, 'gdp_per_capita', code)].at(-1);
			const year = at('USA')[0];
			return {
				year,
				africa: AFRICA.filter((name) => name in PEERS),
				gdpPc: Object.fromEntries(
					Object.entries(PEERS)
						.map(([name, code]) => [name, at(code)])
						.filter(([, last]) => last?.[0] === year)
						.map(([name, [, v]]) => [name, Math.round(v)])
				)
			};
		})(),
		electricityKwhPc: align(
			owidSeries(read('electricity.csv'), 'per_capita_total_generation__kwh')
		),
		// Electricity made per person in the same well-known countries, for "as much power as Egypt today".
		peersKwhPc: (() => {
			const csv = read('electricity.csv');
			return Object.fromEntries(
				Object.entries(PEERS)
					.map(([name, code]) => [
						name,
						[...owidSeries(csv, 'per_capita_total_generation__kwh', code)].at(-1)
					])
					.filter(([, last]) => last)
					.map(([name, [, v]]) => [name, Math.round(v)])
			);
		})(),
		// The market for power sold abroad: total income of the neighbours on the West African grid ($ a year).
		// Income per person holds at its last value; population follows the UN projections.
		neighbourIncome: (() => {
			const gdp = read('gdp-pc.csv');
			const people = read('pop-un.csv');
			const perCountry = NEIGHBOURS.map((code) => {
				const pc = align(owidSeries(gdp, 'gdp_per_capita', code));
				const last = pc.findLast((v) => v != null);
				const pop = align(
					new Map([
						...owidSeries(people, 'population__sex_all__age_all__variant_estimates', code),
						...owidSeries(people, 'population__sex_all__age_all__variant_medium__projected', code)
					])
				);
				return YEARS.map((y, i) => (pop[i] == null || y < 1950 ? null : (pc[i] ?? last) * pop[i]));
			});
			return YEARS.map((_, i) =>
				perCountry.some((s) => s[i] == null)
					? null
					: Math.round(perCountry.reduce((t, s) => t + s[i], 0))
			);
		})(),
		exportAnchors: EXPORT_ANCHORS,
		oilTwh: align(owidSeries(read('oil.csv'), 'oil_production_twh'))
	};
	writeFileSync(OUT, JSON.stringify(national) + '\n');
	console.log('national.json:', Object.keys(national).join(', '));
}
