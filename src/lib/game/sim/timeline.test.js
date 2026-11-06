// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';
import { buildTimeline, createClock } from './timeline.js';
import { frameAt } from './frame.js';

const baseline = runSimulation({ seed: 1, switches: defaultSwitches(), startYear: 1850, endYear: 2025 });
const tl = buildTimeline(baseline);

describe('timeline', () => {
	it('timeAt inverts yearAt', () => {
		for (const t of [6, 9.3, tl.duration / 2, tl.duration - 1]) expect(tl.timeAt(tl.yearAt(t))).toBeCloseTo(t, 6);
	});

	it('event years take longer than quiet years', () => {
		const len = (y) => tl.timeAt(y + 1) - tl.timeAt(y);
		expect(len(1914)).toBeGreaterThan(len(1852));
	});

	it('clamps outside the run', () => {
		expect(tl.yearAt(-5)).toBe(1850);
		expect(tl.yearAt(tl.duration + 99)).toBe(2025);
	});

	it('key years include 1914, 1960 and 1967 for a baseline run', () => {
		expect(tl.keyYears).toEqual(expect.arrayContaining([1914, 1960, 1967]));
	});
});

describe('frames', () => {
	it('interpolates population halfway between years', () => {
		const a = baseline.history.find((h) => h.year === 1900).totals.pop;
		const b = baseline.history.find((h) => h.year === 1901).totals.pop;
		expect(frameAt(baseline, 1900.5).totals.pop).toBeCloseTo((a + b) / 2, -2);
	});

	it('clamps years before the run to the first snapshot', () => {
		const f = frameAt(baseline, 1700);
		expect(f.yearInt).toBe(1850);
		expect(f.cells).toHaveLength(37);
	});

	it('reports nextPolityId for a cell that changes hands', () => {
		const y = baseline.events.find((e) => e.id === 'lagos-annexed').year;
		const lagos = frameAt(baseline, y + 0.5).cells.find((c) => c.id === 'lagos');
		expect(lagos.nextPolityId).not.toBe(lagos.polityId);
	});

	it('marks war fronts and epidemics', () => {
		// The civil war now needs a coup to shake the state first, so take the first seed where it happens.
		const withWar = [1, 2, 3, 4, 5, 6, 7, 8]
			.map((seed) => runSimulation({ seed, switches: defaultSwitches(), startYear: 1850, endYear: 1975 }))
			.find((r) => r.events.some((e) => e.id === 'civil-war'));
		const war = withWar.events.find((e) => e.id === 'civil-war');
		expect(frameAt(withWar, war.year + 1.5).cells.some((c) => c.warFront)).toBe(true);
		expect(frameAt(baseline, 1918.5).cells.every((c) => c.epidemic)).toBe(true);
	});
});

describe('clock', () => {
	it('caps a long pause to 0.25 s', () => {
		const clock = createClock();
		clock.playing = true;
		expect(clock.tick(30)).toBeCloseTo(0.25);
		clock.speed = 2;
		expect(clock.tick(0.1)).toBeCloseTo(0.45);
	});
});
