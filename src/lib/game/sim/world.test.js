// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { createWorld, runSimulation, ENGINE_VERSION } from './world.js';

export const fixture = {
	cells: [
		{ id: 'a', neighbours: ['b'], pop: 1_000_000, area: 10, coastal: true },
		{ id: 'b', neighbours: ['a', 'c'], pop: 500_000, area: 10, coastal: false },
		{ id: 'c', neighbours: ['b'], pop: 250_000, area: 10, coastal: false }
	],
	polities: [
		{ id: 'p1', name: 'One', capitalCell: 'a', cellIds: ['a', 'b'] },
		{ id: 'p2', name: 'Two', capitalCell: 'c', cellIds: ['c'] }
	],
	events: [],
	tech: []
};

const inputs = (seed) => ({ seed, switches: {}, startYear: 1850, endYear: 1870 });

describe('world core', () => {
	it('same seed gives identical history', () => {
		const a = runSimulation(inputs(42), fixture);
		const b = runSimulation(inputs(42), fixture);
		expect(JSON.stringify(a.history)).toBe(JSON.stringify(b.history));
		expect(a.engineVersion).toBe(ENGINE_VERSION);
	});

	it('different seeds give different random streams', () => {
		const a = createWorld(inputs(1), fixture);
		const b = createWorld(inputs(2), fixture);
		expect([a.rand(), a.rand()]).not.toEqual([b.rand(), b.rand()]);
	});

	it('history has one snapshot per year from startYear to endYear inclusive', () => {
		const run = runSimulation(inputs(7), fixture);
		expect(run.history.map((s) => s.year)).toEqual(
			Array.from({ length: 21 }, (_, i) => 1850 + i)
		);
		expect(run.history[0].totals.pop).toBe(1_750_000);
		expect(run.history[0].polities).toHaveLength(2);
	});
});
