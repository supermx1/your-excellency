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

	it('has the Niger and Benue meeting in Kogi (Lokoja), and Lake Chad', () => {
		const pts = (name) => region.rivers.filter((r) => r.name === name).flatMap((r) => r.lines.flat());
		const niger = pts('Niger');
		const benue = pts('Benue');
		expect(niger.length).toBeGreaterThan(10);
		expect(benue.length).toBeGreaterThan(10);
		const meet = benue.find((b) => niger.some((n) => Math.hypot(n[0] - b[0], n[1] - b[1]) < 6));
		expect(meet && rings.get('kogi').some((r) => inside(meet, r))).toBe(true);
		expect(region.lakes.map((l) => l.name)).toContain('Lake Chad');
	});

	it('stays small: world ≤ 150 KB, region ≤ 120 KB', () => {
		const size = (f) => readFileSync(new URL(`./data/${f}`, import.meta.url)).length;
		expect(size('world.json')).toBeLessThanOrEqual(150 * 1024);
		expect(size('region.json')).toBeLessThanOrEqual(120 * 1024);
	});
});

import { neighbourName } from './geo.js';

describe('neighbour names follow real history', () => {
	it('uses the name each neighbour had in that year', () => {
		expect(neighbourName('BEN', 1850)).toBe('Dahomey');
		expect(neighbourName('BEN', 1900)).toBe('French Dahomey');
		expect(neighbourName('BEN', 1980)).toBe('Benin');
		expect(neighbourName('CMR', 1890)).toBe('German Kamerun');
		expect(neighbourName('CMR', 1970)).toBe('Cameroon');
		expect(neighbourName('TGO', 1850)).toBe('Ewe states');
		expect(neighbourName('GNQ', 2000)).toBe('Equatorial Guinea');
	});
});

import { westAfrica } from './data/index.js';

describe('West Africa close-up outlines for the globe', () => {
	it('has a finer Nigeria than the world map, the rivers, and stays small', () => {
		const pts = (c) => c.rings.reduce((s, r) => s + r.length, 0);
		const nga = westAfrica.countries.find((c) => c.id === 'NGA');
		expect(pts(nga)).toBeGreaterThan(3 * pts(world.find((c) => c.id === 'NGA')));
		expect(westAfrica.rivers.map((r) => r.name)).toEqual(expect.arrayContaining(['Niger', 'Benue']));
		for (const c of westAfrica.countries)
			for (const [lon, lat] of c.rings.flat()) {
				expect(lon).toBeGreaterThanOrEqual(westAfrica.box.lon0);
				expect(lat).toBeLessThanOrEqual(westAfrica.box.lat1);
			}
		expect(readFileSync(new URL('./data/westafrica.json', import.meta.url)).length).toBeLessThanOrEqual(150 * 1024);
	});
});
