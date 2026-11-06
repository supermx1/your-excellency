// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { runSimulation } from '../world.js';
import { defaultSwitches, PRESETS } from '../switches.js';

const runs = [1, 2, 3, 4, 5, 6].map((seed) =>
	runSimulation({
		seed,
		switches: { ...defaultSwitches(), ...PRESETS.neverColonized.switches, coups: 'likely' },
		startYear: 1850,
		endYear: 2025
	})
);
const coups = runs.flatMap((r) => r.events.filter((e) => e.kind === 'coup'));

describe('coups are named for their era', () => {
	it('happen at all with coups likely', () => expect(coups.length).toBeGreaterThan(0));

	it('are palace coups before 1900 and military coups after', () => {
		for (const e of coups) expect(e.title).toMatch(e.year < 1900 ? /^Palace coup in / : /^Military coup in /);
	});

	it('restore the old order instead of turning a kingdom into a republic', () => {
		const restored = runs.flatMap((r) => r.events.filter((e) => e.kind === 'government'));
		for (const e of restored.filter((x) => x.year < 1900)) expect(e.title).not.toMatch(/Civilian rule/);
	});
});

describe('a breakaway state and the grid', () => {
	it('takes its share of power stations; none are made or lost', async () => {
		const { createWorld, stepWorld } = await import('../world.js');
		const { secede } = await import('./polities.js');
		const { defaultSwitches } = await import('../switches.js');
		const world = createWorld({ seed: 4, switches: defaultSwitches(), startYear: 1990, endYear: 2000 });
		for (let i = 0; i < 3; i++) stepWorld(world);
		const ng = world.polities.find((p) => p.id === 'nigeria');
		const total = () => world.polities.reduce((s, p) => s + (p.powerSupply ?? 0), 0);
		const before = total();
		const rebel = secede(world, ng, ['anambra', 'enugu', 'imo'], 'Test Republic');
		expect(total()).toBeCloseTo(before, 6);
		expect(rebel.powerSupply).toBeGreaterThan(0);
		expect(rebel.powerSupply).toBeLessThan(before / 2);
	});
});
