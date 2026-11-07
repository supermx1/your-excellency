// @ts-nocheck
// Quality bar: with every switch at history, the simulated Nigeria must roughly track the real one.
// `pnpm sim:calibrate` runs this file and prints the simulated-vs-real table.
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';
import { defaultData } from './data/index.js';
import nbs from './data/nbs.json';
import wealth from './data/dhs-wealth.json';

const SEEDS = 30;
const runs = Array.from({ length: SEEDS }, (_, i) =>
	runSimulation({ seed: i + 1, switches: defaultSwitches(), startYear: 1850, endYear: 2025 })
);
const real = (key, year) => defaultData.national[key][defaultData.national.years.indexOf(year)];
const sim = (key, year) => runs.reduce((s, r) => s + r.history.find((y) => y.year === year).totals[key], 0) / SEEDS;
const share = (pred) => runs.filter(pred).length / SEEDS;

const nigeriaFormed = share((r) => r.history.some((y) => y.polities.some((p) => p.id === 'nigeria')));
const civilWar = share((r) => r.events.some((e) => e.id === 'civil-war'));

const rows = [
	...[1900, 1950, 2000, 2025].map((y) => ['pop', y, sim('pop', y), real('pop', y)]),
	['litSchool', 2018, sim('litSchool', 2018), real('litSchool', 2018)],
	['lifeExp', 2020, sim('lifeExp', 2020), real('lifeExp', 2020)],
	['urban', 2020, sim('urban', 2020), real('urban', 2020)]
];
console.table(rows.map(([k, y, s, r]) => ({ metric: k, year: y, simulated: +s.toFixed(3), real: +r.toFixed(3) })));
console.log({ nigeriaFormed, civilWar });

describe('baseline calibration (mean of 30 seeds)', () => {
	it.each([1900, 1950, 2000, 2025])('population %i within ±15%%', (y) => {
		expect(Math.abs(sim('pop', y) / real('pop', y) - 1)).toBeLessThan(0.15);
	});
	it('school literacy 2018 within ±10 points', () => expect(Math.abs(sim('litSchool', 2018) - real('litSchool', 2018))).toBeLessThan(0.1));
	it('life expectancy 2020 within ±5 years', () => expect(Math.abs(sim('lifeExp', 2020) - real('lifeExp', 2020))).toBeLessThan(5));
	it('urban share 2020 within ±10 points', () => expect(Math.abs(sim('urban', 2020) - real('urban', 2020))).toBeLessThan(0.1));
	it('Nigeria forms in at least 90% of seeds', () => expect(nigeriaFormed).toBeGreaterThanOrEqual(0.9));
	it('population 2100 stays near the UN projection (WPP 2024 medium ≈477M)', () => {
		const pops = [1, 2, 3, 4, 5].map((seed) => runSimulation({ seed, switches: defaultSwitches(), startYear: 1850, endYear: 2100 }).history.at(-1).totals.pop);
		const mean = pops.reduce((a, b) => a + b) / pops.length;
		expect(mean).toBeGreaterThan(300e6);
		expect(mean).toBeLessThan(700e6);
	});
	it('faiths spread to roughly where they are in 2018 (mean state error under 15 points)', () => {
		const real18 = defaultData.regional.religion[2018];
		const err = defaultData.cells.reduce((t, c) => {
			const at = (f) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2018).cells.find((x) => x.id === c.id).religion[f], 0) / SEEDS;
			return t + (Math.abs(at('christian') - real18[c.id].christian) + Math.abs(at('islam') - real18[c.id].islam)) / 2;
		}, 0) / defaultData.cells.length;
		expect(err).toBeLessThan(0.15);
	});
	it('school literacy runs the right way round: south-east above north-west, ranked like survey attendance', () => {
		const lit = (id) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2018).cells.find((x) => x.id === id).litSchool, 0) / SEEDS;
		const mean = (ids) => ids.reduce((t, id) => t + lit(id), 0) / ids.length;
		expect(mean(['anambra', 'enugu', 'imo', 'abia', 'ebonyi'])).toBeGreaterThan(mean(['kano', 'sokoto', 'katsina', 'zamfara', 'kebbi', 'jigawa']) + 0.25);
		const att = defaultData.development.snapshots.find((s) => s.year === 2018).cells;
		const ids = defaultData.cells.map((c) => c.id);
		const rank = (xs) => { const r = []; xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => (r[i] = k)); return r; };
		const a = rank(ids.map((id) => att[id].primaryAttendance.value));
		const b = rank(ids.map(lit));
		const n = ids.length;
		expect(1 - (6 * a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0)) / (n * (n * n - 1))).toBeGreaterThan(0.4);
	});
	it('civil war happens in at least 50% of seeds', () => expect(civilWar).toBeGreaterThanOrEqual(0.5));
	// DHS 2018 household wealth by state. A check only.
	it('income by state in 2018 ranks like DHS household wealth (rank above 0.6)', () => {
		const ids = Object.keys(wealth.meanQuintile);
		const inc = (id) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2018).cells.find((x) => x.id === id).incomePc, 0) / SEEDS;
		const rank = (xs) => { const r = []; xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => (r[i] = k)); return r; };
		const [a, b] = [rank(ids.map(inc)), rank(ids.map((id) => wealth.meanQuintile[id]))];
		const n = ids.length;
		expect(1 - (6 * a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0)) / (n * (n * n - 1))).toBeGreaterThan(0.6);
	});
	// NBS / World Bank NLSS 2018/19: grid hours a day and electricity by state. Checks only.
	it('grid power runs about as many hours a day as NLSS 2018/19 reports (6.8, within 1.5)', () => {
		const at = (k) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2019).totals[k], 0) / SEEDS;
		expect(Math.abs((24 * at('powerService')) / at('electricityAccess') - nbs.nlss2019.nationalGridHours)).toBeLessThan(1.5);
	});
	it('grid connections by state rank roughly like NLSS 2018/19 (rank above 0.35)', () => {
		const ids = Object.keys(nbs.nlss2019.states);
		const acc = (id) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2019).cells.find((x) => x.id === id).electricityAccess, 0) / SEEDS;
		const rank = (xs) => { const r = []; xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => (r[i] = k)); return r; };
		const [a, b] = [rank(ids.map(acc)), rank(ids.map((id) => nbs.nlss2019.states[id].access * nbs.nlss2019.states[id].gridShare))];
		const n = ids.length;
		expect(1 - (6 * a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0)) / (n * (n * n - 1))).toBeGreaterThan(0.35);
	});
	// NBS National Literacy Survey 2010, adults by state. A check only: nothing pulls the model toward it.
	it('school reading by state in 2010 tracks NBS English literacy (rank above 0.8, mean error under 12 points)', () => {
		const ids = Object.keys(nbs.literacy2010);
		const lit = (id) => runs.reduce((s, r) => s + r.history.find((y) => y.year === 2010).cells.find((x) => x.id === id).litSchool, 0) / SEEDS;
		const rank = (xs) => { const r = []; xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => (r[i] = k)); return r; };
		const [a, b] = [rank(ids.map(lit)), rank(ids.map((id) => nbs.literacy2010[id].english))];
		const n = ids.length;
		expect(1 - (6 * a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0)) / (n * (n * n - 1))).toBeGreaterThan(0.8);
		expect(ids.reduce((t, id) => t + Math.abs(lit(id) - nbs.literacy2010[id].english), 0) / n).toBeLessThan(0.12);
	});
});

// The gap is not written in: it comes from where missionaries can work. Change the cause, the map changes.
describe('the north–south reading gap follows causes', () => {
	const north = ['kano', 'sokoto', 'katsina', 'zamfara', 'kebbi', 'jigawa'];
	const east = ['anambra', 'enugu', 'imo', 'abia', 'ebonyi'];
	const school = (sw, ids) => {
		const runs = [1, 2, 3].map((seed) => runSimulation({ seed, switches: { ...defaultSwitches(), ...sw }, startYear: 1850, endYear: 2018 }));
		return ids.reduce((t, id) => t + runs.reduce((s, r) => s + r.history.at(-1).cells.find((c) => c.id === id).litSchool, 0) / runs.length, 0) / ids.length;
	};
	it("without missions most of the south-east's lead over the north disappears", () => {
		const lead = (sw) => school(sw, east) - school(sw, north);
		expect(lead({ christianMissions: false })).toBeLessThan(lead({}) / 3);
	});
	it('without indirect rule the north reads far more than in history', () =>
		expect(school({ indirectRule: false }, north)).toBeGreaterThan(school({}, north) + 0.1));
});

