// @ts-nocheck
// Quality bar: with every switch at history, the simulated Nigeria must roughly track the real one.
// `pnpm sim:calibrate` runs this file and prints the simulated-vs-real table.
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';
import { defaultData } from './data/index.js';

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
	it('civil war happens in at least 50% of seeds', () => expect(civilWar).toBeGreaterThanOrEqual(0.5));
});
