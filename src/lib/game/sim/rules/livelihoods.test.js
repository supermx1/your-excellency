// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../world.js';
import { stepFamilies } from './families.js';
import { defaultData } from '../data/index.js';

const fixture = (overrides = []) =>
	createWorld(
		{ seed: 12, switches: {}, startYear: 1900, endYear: 1950 },
		{
			cells: ['kano', 'oyo'].map((id, i) => ({
				id,
				name: id,
				neighbours: [i ? 'kano' : 'oyo'],
				pop: 1e6,
				area: 1,
				coastal: false,
				infra: 0.5,
				incomePc: 2000,
				...overrides[i]
			})),
			polities: [{ id: 'p', name: 'P', capitalCell: 'kano', cellIds: ['kano', 'oyo'], tech: [] }],
			events: { events: [] },
			tech: [],
			names: defaultData.names
		}
	);

describe('food resilience and migration', () => {
	it('buffers reduce the food pressure caused by the same drought', async () => {
		const { stepLivelihoods } = await import('./livelihoods.js');
		const w = fixture([{ foodBuffer: 0.1 }, { foodBuffer: 0.9 }]);
		w.activeEffects = [
			{ kind: 'productivity', source: 'drought-test', cells: ['kano', 'oyo'], mult: 0.5 }
		];
		stepLivelihoods(w);
		expect(w.cells[0].foodStress).toBeGreaterThan(w.cells[1].foodStress);
		expect(w.cells[0].foodStress).toBeGreaterThan(0.2);
	});
	it('moves people towards opportunity without creating or destroying population', async () => {
		const { stepLivelihoods } = await import('./livelihoods.js');
		const w = fixture([{ incomePc: 500 }, { incomePc: 4000 }]);
		const total = w.cells.reduce((s, c) => s + c.pop, 0);
		stepLivelihoods(w);
		expect(w.cells[0].netMigration).toBeLessThan(0);
		expect(w.cells[1].netMigration).toBeGreaterThan(0);
		expect(w.cells.reduce((s, c) => s + c.pop, 0)).toBeCloseTo(total, 7);
		expect(w.cells.reduce((s, c) => s + c.netMigration, 0)).toBeCloseTo(0, 7);
	});
	it('migration carries literacy and faith shares with the moving people', async () => {
		const { stepLivelihoods } = await import('./livelihoods.js');
		const w = fixture([
			{
				incomePc: 500,
				litAny: 0.1,
				litSchool: 0.05,
				religion: { islam: 1, christian: 0, traditional: 0 }
			},
			{
				incomePc: 4000,
				litAny: 0.9,
				litSchool: 0.8,
				religion: { islam: 0, christian: 1, traditional: 0 }
			}
		]);
		const literate = w.cells.reduce((s, c) => s + c.pop * c.litAny, 0);
		const muslim = w.cells.reduce((s, c) => s + c.pop * c.religion.islam, 0);
		stepLivelihoods(w);
		expect(w.cells.reduce((s, c) => s + c.pop * c.litAny, 0)).toBeCloseTo(literate, 6);
		expect(w.cells.reduce((s, c) => s + c.pop * c.religion.islam, 0)).toBeCloseTo(muslim, 6);
	});
	it('does not move people out of the same source twice in one year', async () => {
		const { stepLivelihoods } = await import('./livelihoods.js');
		const w = fixture([{ warDamage: 1, incomePc: 500 }, { incomePc: 4000 }]);
		stepLivelihoods(w);
		expect(w.cells[0].pop).toBeGreaterThanOrEqual(980000);
		expect(w.cells[1].netMigration).toBeLessThanOrEqual(20000);
	});
	it('turns food pressure and recovery into family events', () => {
		const w = fixture([{ foodStress: 0.6 }, {}]);
		stepFamilies(w);
		const m = w.families.find((f) => f.homeCell === 'kano').members[0];
		expect(m.lifeEvents.some((e) => e.kind === 'hardship')).toBe(true);
		w.cellById.get('kano').foodStress = 0;
		stepFamilies(w);
		expect(m.lifeEvents.some((e) => e.kind === 'recovery')).toBe(true);
	});
	it('real catalogue droughts feed the livelihoods rules', () => {
		const w = createWorld({ seed: 1, switches: {}, startYear: 1913, endYear: 1914 });
		stepWorld(w);
		expect(w.cells.some((c) => c.foodStress > 0.05)).toBe(true);
	});
});
