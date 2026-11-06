// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../world.js';

const inputs = (seed, switches = {}) => ({ seed, switches, startYear: 1850, endYear: 2025 });
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const count = (run, kind) => run.events.filter((e) => e.kind === kind).length;

describe('polities and conflict', () => {
	it('every cell is owned by exactly one polity every year, across 20 seeds', () => {
		for (const seed of seeds) {
			const run = runSimulation(inputs(seed));
			for (const year of run.history) {
				const owned = year.polities.flatMap((p) => p.cellIds).sort();
				expect(owned).toEqual(year.cells.map((c) => c.id).sort());
				for (const c of year.cells) expect(year.polities.find((p) => p.id === c.polityId)?.cellIds).toContain(c.id);
			}
		}
	});

	it('a war records deaths and ends', () => {
		const run = runSimulation(inputs(5));
		const war = run.events.find((e) => e.kind === 'war');
		expect(war).toBeTruthy();
		const peace = run.events.find((e) => e.kind === 'peace' && e.warId === war.warId);
		expect(peace).toBeTruthy();
		expect(peace.deaths).toBeGreaterThan(0);
	});

	it('high trust gives fewer wars than low trust over 20 seeds', () => {
		const wars = (trust) => seeds.reduce((s, seed) => s + count(runSimulation(inputs(seed, { trust })), 'war'), 0);
		expect(wars('high')).toBeLessThan(wars('low'));
	});

	it('coups off gives no coup events', () => {
		for (const seed of seeds.slice(0, 5)) expect(count(runSimulation(inputs(seed, { coups: 'off' })), 'coup')).toBe(0);
	});

	it('a polity with no cells is removed', () => {
		for (const seed of seeds.slice(0, 5)) {
			const run = runSimulation(inputs(seed));
			for (const year of run.history) for (const p of year.polities) expect(p.cellIds.length).toBeGreaterThan(0);
		}
	});
});
