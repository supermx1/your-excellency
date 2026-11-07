// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../world.js';
import { ambition } from './conflict.js';

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
				for (const c of year.cells)
					expect(year.polities.find((p) => p.id === c.polityId)?.cellIds).toContain(c.id);
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
		const wars = (trust) =>
			seeds.reduce((s, seed) => s + count(runSimulation(inputs(seed, { trust })), 'war'), 0);
		expect(wars('high')).toBeLessThan(wars('low'));
	});

	it('coups off gives no coup events', () => {
		for (const seed of seeds.slice(0, 5))
			expect(count(runSimulation(inputs(seed, { coups: 'off' })), 'coup')).toBe(0);
	});

	it('a polity with no cells is removed', () => {
		for (const seed of seeds.slice(0, 5)) {
			const run = runSimulation(inputs(seed));
			for (const year of run.history)
				for (const p of year.polities) expect(p.cellIds.length).toBeGreaterThan(0);
		}
	});

	describe('conquest', () => {
		const runs = seeds.map((seed) =>
			runSimulation(inputs(seed, { britishConquest: false, amalgamation: false }))
		);
		const all = (kind) =>
			runs.flatMap((r) => r.events.filter((e) => e.kind === kind).map((e) => ({ e, r })));

		it('every state taken in war is recorded, naming who took it from whom', () => {
			const taken = all('conquest');
			expect(taken.length).toBeGreaterThan(20);
			for (const { e, r } of taken) {
				expect(e.polityIds).toHaveLength(2);
				expect(e.cellIds.length).toBeGreaterThan(0);
				expect(e.title).toMatch(/takes|conquers/);
				const after = r.history.find((h) => h.year === e.year + 1);
				const owner = after.cells.find((c) => c.id === e.cellIds[0]).polityId;
				expect(after.polities.find((p) => p.id === owner)).toBeTruthy();
			}
		});

		it('a beaten state can be conquered whole, across 20 seeds', () => {
			const whole = all('conquest').filter(({ e }) => e.annexed);
			expect(whole.length).toBeGreaterThan(0);
			for (const { e, r } of whole) {
				const after = r.history.find((h) => h.year === e.year + 1);
				expect(after.polities.some((p) => p.id === e.polityIds[1])).toBe(false);
			}
		});

		it('a clear victory ends in a peace that hands over land', () => {
			const ceded = all('peace').filter(({ e }) => e.ceded?.length);
			expect(ceded.length).toBeGreaterThan(0);
			for (const { e } of ceded) expect(e.title).toMatch(/cedes/);
		});

		it("a stronger, crowded, settled state wants its neighbour's land more than an equal one does", () => {
			const cell = (id, pop, foodStress) => ({ id, pop, foodStress });
			const cells = [cell('a', 1000, 0.4), cell('b', 1000, 0.4), cell('c', 100, 0.4)];
			const world = { cellById: new Map(cells.map((c) => [c.id, c])) };
			const p = (id, stability) => ({ id, cellIds: [id], army: 0.02, stability, knowledge: 0 });
			const [big, equal, small] = [p('a', 0.7), p('b', 0.7), p('c', 0.7)];
			expect(ambition(world, big, equal)).toBe(0);
			expect(ambition(world, big, small)).toBeGreaterThan(0);
			expect(ambition(world, small, big)).toBe(0);
			const shaky = p('a', 0.2);
			expect(ambition(world, shaky, small)).toBeLessThan(ambition(world, big, small));
			cells[0].foodStress = 0;
			expect(ambition(world, big, small)).toBeLessThan(ambition(world, p('b', 0.7), small));
		});
	});
});
