// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { createWorld } from '../world.js';
import { stepDemography } from './demography.js';
import { stepEconomy } from './economy.js';

function world(cells, switches = {}) {
	const data = {
		cells: cells.map((c, i) => ({ id: `c${i}`, neighbours: [], area: 1, coastal: false, pop: 1e6, ...c })),
		polities: [{ id: 'p', name: 'P', capitalCell: 'c0', cellIds: cells.map((_, i) => `c${i}`) }],
		events: { events: [] },
		tech: []
	};
	return createWorld({ seed: 1, switches, startYear: 1900, endYear: 2000 }, data);
}

const years = (w, n) => {
	for (let i = 0; i < n; i++) {
		w.cells.forEach((c) => (c.mods = { mortality: 1, productivity: 1, learning: w.switches.learning ?? 1 }));
		stepEconomy(w);
		stepDemography(w);
	}
};

describe('demography and economy', () => {
	it('population grows when nothing bad happens', () => {
		const w = world([{}]);
		years(w, 50);
		expect(w.cells[0].pop).toBeGreaterThan(1e6);
	});

	it('higher literacy lowers birth and death rates', () => {
		const w = world([{ litAny: 0.02 }, { litAny: 0.8, litSchool: 0.8 }]);
		years(w, 1);
		expect(w.cells[1].birthRate).toBeLessThan(w.cells[0].birthRate);
		expect(w.cells[1].deathRate).toBeLessThan(w.cells[0].deathRate);
	});

	it('war damage reduces population that year', () => {
		const w = world([{}, { warDamage: 1 }]);
		years(w, 1);
		expect(w.cells[1].pop).toBeLessThan(w.cells[0].pop);
	});

	it('values stay finite and pop >= 0 after a 90% mortality shock', () => {
		const w = world([{ pop: 10 }]);
		w.cells[0].pop *= 0.1;
		years(w, 1);
		w.cells[0].mods.mortality = 50;
		stepDemography(w);
		for (const v of [w.cells[0].pop, w.cells[0].lifeExp, w.cells[0].incomePc, w.cells[0].litAny]) {
			expect(Number.isFinite(v)).toBe(true);
			expect(v).toBeGreaterThanOrEqual(0);
		}
	});

	it('learning switch x3 raises litAny faster than x1', () => {
		const slow = world([{ schools: { quranic: 0.3, mission: 0.3, state: 0 } }], { learning: 1 });
		const fast = world([{ schools: { quranic: 0.3, mission: 0.3, state: 0 } }], { learning: 3 });
		years(slow, 20);
		years(fast, 20);
		expect(fast.cells[0].litAny).toBeGreaterThan(slow.cells[0].litAny);
	});

	it('urban share rises with income', () => {
		const w = world([{ litSchool: 0.9, litAny: 0.9, infra: 0.8 }, {}]);
		years(w, 60);
		expect(w.cells[0].urban).toBeGreaterThan(w.cells[1].urban);
	});
});

describe('life expectancy from the death rate', () => {
	it('passes through the real pairs and extends beyond them', async () => {
		const { lifeExpectancy } = await import('./demography.js');
		expect(lifeExpectancy(0.0275)).toBeCloseTo(35.5, 5);
		expect(lifeExpectancy(0.0174)).toBeCloseTo(47.1, 5);
		expect(lifeExpectancy(0.0126)).toBeCloseTo(53.1, 5);
		expect(lifeExpectancy(0.05)).toBeLessThan(22);
		expect(lifeExpectancy(0.004)).toBeGreaterThan(75);
	});
});
