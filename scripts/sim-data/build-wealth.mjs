// DHS 2018 household wealth by state, as a check on simulated income (never an input).
// Writes the mean wealth quintile (1 = poorest fifth nationally, 5 = richest) per state.
import { readFileSync, writeFileSync } from 'node:fs';

const URL_2018 =
	'https://api.dhsprogram.com/rest/dhs/data?surveyIds=NG2018DHS&indicatorIds=HC_WIXQ_P_LOW,HC_WIXQ_P_2ND,HC_WIXQ_P_MID,HC_WIXQ_P_4TH,HC_WIXQ_P_HGH&breakdown=all&perpage=2000&f=json';
const QUINTILE = { HC_WIXQ_P_LOW: 1, HC_WIXQ_P_2ND: 2, HC_WIXQ_P_MID: 3, HC_WIXQ_P_4TH: 4, HC_WIXQ_P_HGH: 5 };
const OUT = new URL('../../src/lib/game/sim/data/dhs-wealth.json', import.meta.url);
const cells = JSON.parse(readFileSync(new URL('../../src/lib/game/sim/data/cells.json', import.meta.url), 'utf8'));
const stateId = (label) => {
	const name = label.replace(/^\.\./, '').trim();
	return { 'FCT Abuja': 'fct', Nasarawa: 'nassarawa' }[name] ?? name.toLowerCase().replaceAll(' ', '-');
};

const res = await (await fetch(URL_2018)).json();
const sum = {};
const share = {};
for (const row of res.Data ?? []) {
	if (row.CharacteristicCategory !== 'Region' || !row.CharacteristicLabel.startsWith('..')) continue;
	const id = stateId(row.CharacteristicLabel);
	if (!cells.some((c) => c.id === id)) throw new Error(`Unknown DHS state ${row.CharacteristicLabel}`);
	sum[id] = (sum[id] ?? 0) + (QUINTILE[row.IndicatorId] * row.Value) / 100;
	share[id] = (share[id] ?? 0) + row.Value;
}
for (const c of cells)
	if (!(Math.abs((share[c.id] ?? 0) - 100) < 1)) throw new Error(`Wealth quintiles for ${c.id} do not add to 100`);
writeFileSync(
	OUT,
	JSON.stringify({
		survey: 'NG2018DHS',
		meanQuintile: Object.fromEntries(cells.map((c) => [c.id, Math.round(sum[c.id] * 100) / 100])),
		sources: [
			{
				name: 'National Population Commission / ICF — Nigeria DHS 2018, household wealth quintiles by state (STATcompiler API)',
				url: URL_2018,
				licence: 'DHS terms of use',
				files: ['dhs-wealth.json']
			}
		]
	}) + '\n'
);
console.log('dhs wealth: written for', cells.length, 'states');
