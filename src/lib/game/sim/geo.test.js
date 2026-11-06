// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import map from '@svg-maps/nigeria';
import { parsePath } from './svgpath.js';
import { lonLatToSvg, SVG_FIT } from './geo.js';
import { world, region } from './data/index.js';

const W = 744;
const rings = new Map(map.locations.map((l) => [l.id, parsePath(l.path)]));
const inside = ([x, y], ring) => {
	let c = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
};
const CITIES = { kano: [8.52, 12.0], lagos: [3.39, 6.45], borno: [13.16, 11.85], 'cross-river': [8.33, 4.95] };

describe('lon/lat → SVG fit', () => {
	it('puts Kano, Lagos, Maiduguri and Calabar inside their states', () => {
		for (const [id, ll] of Object.entries(CITIES)) {
			const p = lonLatToSvg(ll);
			expect(rings.get(id).some((r) => inside(p, r)), id).toBe(true);
		}
	});

	it("fits Nigeria's outline to the map within 2% of the map width", () => {
		expect(SVG_FIT.error).toBeLessThan(0.02 * W);
	});
});

describe('world and region data', () => {
	it('world.json has at least 170 countries including Nigeria', () => {
		expect(world.length).toBeGreaterThanOrEqual(170);
		expect(world.find((c) => c.id === 'NGA')?.rings.length).toBeGreaterThan(0);
	});

	it('region.json has the six neighbours, each with a ring', () => {
		const ids = region.neighbours.map((n) => n.id).sort();
		expect(ids).toEqual(['BEN', 'CMR', 'GNQ', 'NER', 'TCD', 'TGO']);
		for (const n of region.neighbours) expect(n.rings.length).toBeGreaterThan(0);
	});

	it('stays small: world ≤ 150 KB, region ≤ 120 KB', () => {
		const size = (f) => readFileSync(new URL(`./data/${f}`, import.meta.url)).length;
		expect(size('world.json')).toBeLessThanOrEqual(150 * 1024);
		expect(size('region.json')).toBeLessThanOrEqual(120 * 1024);
	});
});
