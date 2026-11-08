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
	runSimulation({
		seed,
		switches: { ...defaultSwitches(), ...switches },
		startYear: 1850,
		endYear: 2025
	});
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
	it('give neighbouring 1850 states clearly different colours', () => {
		const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
		const owner = new Map(defaultData.polities.flatMap((p) => p.cellIds.map((id) => [id, p.id])));
		for (const c of defaultData.cells)
			for (const n of c.neighbours) {
				const [a, b] = [owner.get(c.id), owner.get(n)];
				if (!a || !b || a === b) continue;
				const [x, y] = [rgb(polityColor(a)), rgb(polityColor(b))];
				// The old south-western greens were about 28 apart.
				expect(Math.hypot(...x.map((v, i) => v - y[i])), `${a} next to ${b}`).toBeGreaterThan(60);
			}
	});
});

describe('hud data', () => {
	it('statsAt shows the real population as ours', () => {
		const pop = statsAt(baseline, defaultData.national, 1950).find((s) => s.key === 'pop');
		expect(pop.ours).toBe(defaultData.national.pop[defaultData.national.years.indexOf(1950)]);
	});

	it('never-colonized 1914 caption mentions the real amalgamation', () => {
		const caps = captionsAt(never, 1914.5);
		expect(
			caps.some((c) => c.ours === 'In our world: North and South are amalgamated into Nigeria')
		).toBe(true);
	});

	it('familyCardsAt returns at most 2 cards', () => {
		for (const y of [1870, 1900, 1950, 2000])
			expect(familyCardsAt(baseline, y).length).toBeLessThanOrEqual(2);
		expect(
			familyCardsAt(baseline, 1900).length + familyCardsAt(baseline, 1950).length
		).toBeGreaterThan(0);
	});

	it('family cards have unique keys every year', () => {
		for (const r of [baseline, never])
			for (let y = 1850; y <= 2025; y++) {
				const keys = familyCardsAt(r, y).map((c) => c.key);
				expect(new Set(keys).size).toBe(keys.length);
			}
	});

	it('realBordersAt 1920 is one Nigeria', () =>
		expect(realBordersAt(1920).map((p) => p.id)).toEqual(['nigeria']));
	it('our world shows Biafra from 1967 until 1970', () => {
		expect(realBordersAt(1968).map((p) => p.name)).toContain('Republic of Biafra');
		expect(realBordersAt(1970).map((p) => p.id)).toEqual(['nigeria']);
	});
	it('a run starting mid-war begins from peacetime borders', async () => {
		const { createWorld } = await import('./world.js');
		const { defaultSwitches } = await import('./switches.js');
		const w = createWorld({ seed: 1, switches: defaultSwitches(), startYear: 1968, endYear: 1970 });
		expect(w.polities.map((p) => p.id)).toEqual(['nigeria']);
	});
});

describe('camera', () => {
	it('starts on the wide shot once the intro ends', () => {
		const shots = shotsFor(baseline, buildTimeline(baseline));
		expect(cameraAt(shots, 6)).toEqual(WIDE);
	});
});

import { endingRows, realFrame } from './hud.js';

describe('ending', () => {
	it('compares how people live, plus 50-run lines when a summary is given', () => {
		const rows = endingRows(never, defaultData.national, null);
		expect(rows.map((r) => r.label)).toEqual([
			'Population',
			'Can read (school)',
			'Can read (any script)',
			'Life expectancy',
			'Income per person',
			'Has electricity',
			'Wars',
			'Biggest city',
			'Religious mix'
		]);
		const income = rows.find((r) => r.label === 'Income per person');
		expect(income.theirs).toBeGreaterThan(0);
		expect(income.oursValue).toBeGreaterThan(4000); // OWID GDP per person, 2022
		expect(rows.find((r) => r.label === 'Has electricity').theirs).toMatch(/^\d+%/);
		const withSummary = endingRows(never, defaultData.national, {
			runs: 50,
			withWar: 41,
			nigeriaFormed: 3
		});
		expect(withSummary.find((r) => r.label === 'In 50 runs').theirs).toBe(
			'41 had a war · Nigeria formed in 3'
		);
	});

	it("dates our figures when they are older than the run's end, and adds space only when reached", () => {
		const to2100 = runSimulation({
			seed: 1,
			switches: { ...defaultSwitches(), learning: 3 },
			startYear: 1850,
			endYear: 2100
		});
		const rows = endingRows(to2100, defaultData.national, null);
		expect(rows.find((r) => r.label === 'Income per person').ours).toMatch(/^\$[\d,]+ \(20\d\d\)$/);
		expect(rows.find((r) => r.label === 'Has electricity').ours).toMatch(/^\d+% \(2018\)$/);
		expect(rows.find((r) => r.label === 'People in space')).toMatchObject({ ours: 'Not yet' });
		expect(
			endingRows(never, defaultData.national, null).some((r) => r.label === 'People in space')
		).toBe(false);
	});

	it('the real side uses Lagos as the biggest city', () => {
		expect(
			endingRows(baseline, defaultData.national, null).find((r) => r.label === 'Biggest city').ours
		).toBe('Lagos');
	});

	it('realFrame paints the real borders for a year', () => {
		const f = realFrame(1920);
		expect(new Set(f.cells.map((c) => c.polityId))).toEqual(new Set(['nigeria']));
		expect(f.cells).toHaveLength(37);
	});

	it('realFrame gives each of the 37 areas its own colour inside Nigeria', () => {
		const cells = realFrame(2020).cells;
		expect(new Set(cells.map((c) => c.color)).size).toBe(37);
	});
});

import { placeAt } from './hud.js';
import { frameAt } from './frame.js';

describe('placeAt (hover and click on the map)', () => {
	it('names the polity ruling a state at that time, and the state today', () => {
		const p = placeAt(never, frameAt(never, 1850), 'kano');
		expect(p.name).toBe('Sokoto Caliphate');
		expect(p.today).toBe('Kano State today');
		expect(p.cellIds).toContain('sokoto');
		expect(placeAt(never, frameAt(never, 1850), 'fct').today).toBe(
			'Federal Capital Territory today'
		);
	});

	it('adds the real-history name only when it differs', () => {
		expect(placeAt(never, frameAt(never, 1850), 'kano').ours).toBeNull();
		const real = placeAt(baseline, frameAt(baseline, 1950), 'kano');
		expect(real.ours).toBeNull();
		const late = frameAt(never, 1950);
		const p = placeAt(never, late, 'kano');
		expect(p.name).not.toBe('Nigeria');
		expect(p.ours).toMatch(/^In our world: /);
	});

	it('totals the whole polity and lists its wars', () => {
		const f = frameAt(never, 1900);
		const p = placeAt(never, f, 'kano');
		const total = f.cells.filter((c) => p.cellIds.includes(c.id)).reduce((s, c) => s + c.pop, 0);
		expect(p.pop).toBeCloseTo(total, 0);
		expect(p.litSchool).toBeGreaterThanOrEqual(0);
		expect(p.here.litAny).toBeGreaterThanOrEqual(p.here.litSchool);
		expect(p.religion.islam + p.religion.christian + p.religion.traditional).toBeCloseTo(1, 1);
		expect(Array.isArray(p.atWarWith)).toBe(true);
	});

	it('returns null for an unknown cell', () =>
		expect(placeAt(never, frameAt(never, 1900), 'atlantis')).toBeNull());
});

import { shortPeople } from './format.js';

describe('shortPeople', () => {
	it('writes head counts short enough for the map', () => {
		expect([23.4e6, 4.46e6, 451_000].map(shortPeople)).toEqual(['23M', '4.5M', '451k']);
	});
});

describe('their-world state lines', () => {
	it('paints each state Nigeria holds its own colour, and leaves other polities to their polity colour', () => {
		const f = frameAt(baseline, 2025);
		const held = f.cells.filter((c) => c.polityId === 'nigeria' && c.nextPolityId === 'nigeria');
		expect(held.length).toBeGreaterThan(1);
		expect(new Set(held.map((c) => c.color)).size).toBe(held.length);
		expect(f.cells.filter((c) => c.polityId !== 'nigeria').every((c) => c.color === undefined)).toBe(true);
		expect(frameAt(never, 1850).cells.every((c) => c.color === undefined)).toBe(true);
	});
});
