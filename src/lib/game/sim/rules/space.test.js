// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { runSimulation } from '../world.js';
import { defaultSwitches } from '../switches.js';
import { defaultData } from '../data/index.js';

const SPACE = ['crewed-spaceflight', 'space-station', 'reusable-rockets', 'moon-base', 'mars-landing', 'asteroid-mining', 'interstellar-probe'];
const run = (seed, switches = {}) =>
	runSimulation({ seed, switches: { ...defaultSwitches(), ...switches }, startYear: 1850, endYear: 2100 });
const firsts = (r) => r.events.filter((e) => e.kind === 'invention' && SPACE.includes(e.techId));

describe('the future tech ladder', () => {
	it('is in the tech data, built on satellites, with no real dates for what nobody has done yet', () => {
		const byId = new Map(defaultData.tech.map((t) => [t.id, t]));
		for (const id of [...SPACE, 'fusion-power']) expect(byId.has(id), id).toBe(true);
		expect(byId.get('crewed-spaceflight').requires).toContain('satellite');
		expect(byId.get('moon-base').worldYear).toBeNull();
	});

	it('stays out of reach before 2100 in ordinary worlds', () => {
		for (const seed of [1, 2, 3]) expect(firsts(run(seed))).toEqual([]);
	});

	it('a 200 IQ world reaches space, ahead of the real world', () => {
		const r = run(1, { learning: 3 });
		const crewed = firsts(r).find((e) => e.techId === 'crewed-spaceflight');
		expect(crewed?.aheadOfReal).toBeGreaterThan(0);
		const moon = firsts(r).find((e) => e.techId === 'moon-base');
		expect(moon).toMatchObject({ worldFirst: true });
		expect(moon.title).toMatch(/^World first: Moon base in /);
	});

	it('is never handed to a country by the outside world', () => {
		const r = run(1, { learning: 3 });
		expect(r.events.some((e) => e.kind === 'adoption' && SPACE.includes(e.techId))).toBe(false);
		for (const p of r.history.at(-1).polities) expect(p.tech ?? []).not.toContain(undefined);
	});

	it('only the first state to invent something gets the world first; the rest are breakthroughs', () => {
		const r = run(1, { learning: 3 });
		const firstsByTech = new Map();
		for (const e of r.events.filter((x) => x.kind === 'invention')) {
			if (e.worldFirst) {
				expect(firstsByTech.has(e.techId), e.techId).toBe(false);
				firstsByTech.set(e.techId, e.year);
				expect(e.title).toMatch(/^World first: /);
			} else expect(e.title).toMatch(/^Breakthrough in /);
		}
		const repeats = r.events.filter((x) => x.kind === 'invention' && !x.worldFirst && firstsByTech.has(x.techId));
		expect(repeats.length).toBeGreaterThan(0);
		for (const e of repeats) expect(e.year).toBeGreaterThanOrEqual(firstsByTech.get(e.techId));
	});

	it('invention headlines read cleanly for every technology', () => {
		const r = run(2, { learning: 3 });
		for (const e of r.events.filter((x) => x.kind === 'invention')) expect(e.title).not.toMatch(/invents the|the the/i);
	});
});
