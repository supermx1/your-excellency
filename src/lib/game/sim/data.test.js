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
