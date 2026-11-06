// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { createWorld } from './world.js';
import { defaultData } from './data/index.js';

const input = (year) => ({ seed: 1, switches: {}, startYear: year, endYear: year + 1 });

describe('historical population initialization', () => {
	it('uses an independently reconstructed distribution for 1850', () => {
		const early = createWorld(input(1850));
		const later = createWorld(input(2006));
		const share = (w, id) => w.cellById.get(id).pop / w.cells.reduce((s, c) => s + c.pop, 0);
		// The previous approach reused 2006 shares for both of these inland states.
		// Hand-checked source extract: Oyo 784104.049, Kano 1256688.293 in the 1861 grid.
		expect(share(early, 'oyo') / share(early, 'kano')).toBeCloseTo(0.623944739, 5);
		expect(
			Math.abs(
				share(early, 'oyo') / share(early, 'kano') - share(later, 'oyo') / share(later, 'kano')
			)
		).toBeGreaterThan(0.01);
		expect(defaultData.regional.populationEvidence.earliestGridYear).toBe(1861);
		expect(defaultData.regional.populationEvidence.proxyYears).toEqual({ 1850: 1861 });
	});

	it('interpolates regional shares and preserves the national total exactly', () => {
		const data = structuredClone(defaultData);
		const first = Object.fromEntries(data.cells.map((c) => [c.id, 1]));
		const second = { ...first, lagos: 75 };
		data.regional.pop = { 1900: first, 1910: second };
		const year = 1905;
		const w = createWorld(input(year), data);
		const total = w.cells.reduce((s, c) => s + c.pop, 0);
		const lagos = w.cellById.get('lagos').pop / total;
		expect(total).toBe(Math.round(data.national.pop[data.national.years.indexOf(year)]));
		// Half of 1/37 plus half of 75/111, independent of national growth.
		expect(lagos).toBeCloseTo(0.35135135135, 5);
	});
});
