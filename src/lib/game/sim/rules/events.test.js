// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../world.js';
import { defaultData } from '../data/index.js';

const run = (seed, switches = {}, startYear = 1850, endYear = 2025) =>
	runSimulation({ seed, switches, startYear, endYear });
const ids = (r) => new Set(r.events.map((e) => e.id).filter(Boolean));
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const realYear = Object.fromEntries(defaultData.tech.map((t) => [t.id, t.worldYear]));

describe('technology and events', () => {
	it('conquest off means no amalgamation', () => {
		const r = run(1, { britishConquest: false });
		expect(ids(r).has('amalgamation')).toBe(false);
		expect(ids(r).has('lagos-annexed')).toBe(false);
	});

	it('baseline conquest and amalgamation create Nigeria', () => {
		const r = run(1);
		expect(ids(r).has('amalgamation')).toBe(true);
		expect(r.history.find((y) => y.year === 1920).polities.some((p) => p.id === 'nigeria')).toBe(true);
	});

	it('civil war is skipped without error when Nigeria does not exist', () => {
		const r = run(2, { britishConquest: false });
		expect(ids(r).has('civil-war')).toBe(false);
		expect(r.history.at(-1).year).toBe(2025);
	});

	it('world events such as the 1918 flu fire in every run', () => {
		for (const sw of [{}, { britishConquest: false }, { learning: 3 }]) expect(ids(run(3, sw)).has('flu-1918')).toBe(true);
	});

	it('learning x3 invents something before its real world year in most of 20 seeds', () => {
		const ahead = seeds.filter((s) => run(s, { learning: 3 }).events.some((e) => e.kind === 'invention' && e.aheadOfReal > 0));
		expect(ahead.length).toBeGreaterThan(10);
	});

	it('learning x1 never gets a technology before its world year', () => {
		for (const s of seeds.slice(0, 5))
			for (const e of run(s).events.filter((e) => e.kind === 'adoption' || e.kind === 'invention'))
				expect(e.year).toBeGreaterThanOrEqual(realYear[e.techId]);
	});
});
