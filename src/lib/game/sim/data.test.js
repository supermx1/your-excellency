// @ts-nocheck
import { describe, expect, it } from 'vitest';
import cells from './data/cells.json';

const byId = new Map(cells.map((c) => [c.id, c]));

describe('cells', () => {
	it('has 37 cells', () => expect(cells).toHaveLength(37));

	it('neighbours are symmetric', () => {
		for (const c of cells) for (const n of c.neighbours) expect(byId.get(n).neighbours).toContain(c.id);
	});

	it('lagos neighbours include ogun', () => expect(byId.get('lagos').neighbours).toContain('ogun'));

	it('kano neighbours include jigawa and kaduna', () => {
		expect(byId.get('kano').neighbours).toEqual(expect.arrayContaining(['jigawa', 'kaduna']));
	});

	it('every cell has at least one neighbour', () => {
		for (const c of cells) expect(c.neighbours.length).toBeGreaterThan(0);
	});

	it('coastal cells are the eight on the sea', () => {
		expect(cells.filter((c) => c.coastal).map((c) => c.id).sort()).toEqual(
			['akwa-ibom', 'bayelsa', 'cross-river', 'delta', 'lagos', 'ogun', 'ondo', 'rivers'].sort()
		);
	});
});

import national from './data/national.json';
import regional from './data/regional.json';
import polities1850 from './data/polities-1850.json';
import realBorders from './data/real-borders.json';
import eventsData from './data/events.json';
import tech from './data/tech.json';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';

const at = (series, y) => series[national.years.indexOf(y)];
const coversOnce = (polities) => {
	const all = polities.flatMap((p) => p.cellIds).sort();
	expect(all).toEqual(cells.map((c) => c.id).sort());
};

describe('real data', () => {
	it('national population is plausible', () => {
		expect(at(national.pop, 1950)).toBeGreaterThan(30e6);
		expect(at(national.pop, 1950)).toBeLessThan(45e6);
		expect(at(national.pop, 2025)).toBeGreaterThan(200e6);
		expect(at(national.pop, 2025)).toBeLessThan(260e6);
	});

	it('1850 cell populations sum to the national 1850 value', () => {
		const sum = Object.values(regional.pop[1850]).reduce((a, b) => a + b, 0);
		expect(Math.abs(sum / at(national.pop, 1850) - 1)).toBeLessThan(0.05);
	});

	it('religion shares sum to 1 in every cell and year', () => {
		for (const table of Object.values(regional.religion))
			for (const s of Object.values(table)) expect(s.islam + s.christian + s.traditional).toBeCloseTo(1, 2);
	});

	it('1850 polities cover every cell exactly once', () => coversOnce(polities1850));

	it('every real-borders snapshot covers every cell exactly once', () => {
		for (const snap of realBorders) coversOnce(snap.polities);
	});

	it('event requirements name known flags', () => {
		for (const e of eventsData.events) for (const r of e.requires ?? []) expect(eventsData.flags).toContain(r);
	});

	it('tech requirements name known tech', () => {
		const ids = new Set(tech.map((t) => t.id));
		for (const t of tech) for (const r of t.requires) expect(ids.has(r)).toBe(true);
	});

	it('shipped data is under 1 MB gzipped', () => {
		const dir = new URL('./data/', import.meta.url);
		const bytes = readdirSync(dir).reduce((s, f) => s + gzipSync(readFileSync(new URL(f, dir))).length, 0);
		expect(bytes).toBeLessThan(1_000_000);
	});
});
