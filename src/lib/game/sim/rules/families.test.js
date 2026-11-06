// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../world.js';

const run = (seed, switches = {}) => runSimulation({ seed, switches, startYear: 1850, endYear: 2025 });
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const runs = seeds.map((s) => run(s));

describe('families', () => {
	it('four families exist from the start year', () => {
		const r = runs[0];
		expect(r.families).toHaveLength(4);
		expect(r.families.map((f) => f.homeCell).sort()).toEqual(['anambra', 'cross-river', 'kano', 'oyo']);
		for (const f of r.families) expect(f.members[0].born).toBeLessThanOrEqual(1850);
	});

	it('a new generation appears every 20 to 30 years', () => {
		for (const f of runs[0].families) {
			expect(f.members.length).toBeGreaterThanOrEqual(6);
			for (let i = 1; i < f.members.length; i++) {
				const gap = f.members[i].born - f.members[i - 1].born;
				expect(gap).toBeGreaterThanOrEqual(20);
				expect(gap).toBeLessThanOrEqual(30);
			}
		}
	});

	it('reading follows how literate the cell was when they grew up', () => {
		const members = runs.flatMap((r) => r.families.flatMap((f) => f.members)).filter((m) => m.litAtYouth != null);
		const share = (ms) => ms.filter((m) => m.canRead).length / ms.length;
		const low = members.filter((m) => m.litAtYouth < 0.1);
		const high = members.filter((m) => m.litAtYouth > 0.5);
		expect(low.length).toBeGreaterThan(10);
		expect(high.length).toBeGreaterThan(10);
		expect(share(high)).toBeGreaterThan(share(low) + 0.3);
	});

	it('members can die in a war that hits their cell', () => {
		const warDeaths = runs.flatMap((r) => r.families.flatMap((f) => f.members)).filter((m) => m.lifeEvents.some((e) => e.kind === 'war-death'));
		expect(warDeaths.length).toBeGreaterThan(0);
	});

	it('household money decides school, moves and shops, and a crisis can empty it', () => {
		const families = runs.flatMap((r) => r.families);
		const events = families.flatMap((f) => f.members.flatMap((m) => m.lifeEvents));
		for (const kind of ['school', 'no-school', 'business', 'savings-gone']) expect(events.some((e) => e.kind === kind), kind).toBe(true);
		const start = runs[0].history[0].year;
		for (const f of families)
			for (const m of f.members)
				for (const e of m.lifeEvents.filter((e) => e.kind === 'savings-gone')) expect(f.months[e.year - start]).toBe(0);
		const members = families.flatMap((f) => f.members).filter((m) => m.litAtYouth != null);
		const reads = (ms) => ms.filter((m) => m.canRead).length / ms.length;
		expect(reads(members.filter((m) => m.schooled))).toBeGreaterThan(reads(members.filter((m) => !m.schooled)) + 0.3);
	});
});
