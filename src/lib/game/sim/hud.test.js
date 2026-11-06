// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches, PRESETS } from './switches.js';
import { defaultData } from './data/index.js';
import { polityColor } from './colors.js';
import { statsAt, captionsAt, familyCardsAt, realBordersAt } from './hud.js';
import { shotsFor, cameraAt, WIDE } from './camera.js';
import { buildTimeline } from './timeline.js';

const run = (switches, seed = 1) =>
	runSimulation({ seed, switches: { ...defaultSwitches(), ...switches }, startYear: 1850, endYear: 2025 });
const baseline = run({});
const never = run(PRESETS.neverColonized.switches);
const hue = (hex) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	if (max === min) return 0;
	const d = max - min;
	const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return (h * 60 + 360) % 360;
};

describe('colours', () => {
	it('are stable per id', () => expect(polityColor('kano-1903')).toBe(polityColor('kano-1903')));
	it('use the fixed 1850 palette', () => expect(polityColor('sokoto')).toBe('#c9a227'));
	it('spread new polities from the same year at least 30° apart', () => {
		const d = Math.abs(hue(polityColor('kano-1901')) - hue(polityColor('lagos-1901')));
		expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(30);
	});
});

describe('hud data', () => {
	it('statsAt shows the real population as ours', () => {
		const pop = statsAt(baseline, defaultData.national, 1950).find((s) => s.key === 'pop');
		expect(pop.ours).toBe(defaultData.national.pop[defaultData.national.years.indexOf(1950)]);
	});

	it('never-colonized 1914 caption mentions the real amalgamation', () => {
		const caps = captionsAt(never, 1914.5);
		expect(caps.some((c) => c.ours === 'In our world: North and South are amalgamated into Nigeria')).toBe(true);
	});

	it('familyCardsAt returns at most 2 cards', () => {
		for (const y of [1870, 1900, 1950, 2000]) expect(familyCardsAt(baseline, y).length).toBeLessThanOrEqual(2);
		expect(familyCardsAt(baseline, 1900).length + familyCardsAt(baseline, 1950).length).toBeGreaterThan(0);
	});

	it('family cards have unique keys every year', () => {
		for (const r of [baseline, never])
			for (let y = 1850; y <= 2025; y++) {
				const keys = familyCardsAt(r, y).map((c) => c.key);
				expect(new Set(keys).size).toBe(keys.length);
			}
	});

	it('realBordersAt 1920 is one Nigeria', () => expect(realBordersAt(1920).map((p) => p.id)).toEqual(['nigeria']));
});

describe('camera', () => {
	it('starts on the wide shot', () => {
		const shots = shotsFor(baseline, buildTimeline(baseline));
		expect(cameraAt(shots, 0)).toEqual(WIDE);
	});
});

import { endingRows, realFrame } from './hud.js';

describe('ending', () => {
	it('has six comparison rows, plus 50-run lines when a summary is given', () => {
		const rows = endingRows(never, defaultData.national, null);
		expect(rows.map((r) => r.label)).toEqual(['Population', 'Can read', 'Life expectancy', 'Wars', 'Biggest city', 'Religious mix']);
		const withSummary = endingRows(never, defaultData.national, { runs: 50, withWar: 41, nigeriaFormed: 3 });
		expect(withSummary.some((r) => r.label === 'In 50 runs')).toBe(true);
	});

	it('the real side uses Lagos as the biggest city', () => {
		expect(endingRows(baseline, defaultData.national, null).find((r) => r.label === 'Biggest city').ours).toBe('Lagos');
	});

	it('realFrame paints the real borders for a year', () => {
		const f = realFrame(1920);
		expect(new Set(f.cells.map((c) => c.polityId))).toEqual(new Set(['nigeria']));
		expect(f.cells).toHaveLength(37);
	});
});
