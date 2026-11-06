// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { cellShapes, sharedEdges, toWorld } from './geometry.js';

describe('diorama geometry', () => {
	it('has shapes for all 37 cells', () => {
		const shapes = cellShapes();
		expect(shapes.size).toBe(37);
		for (const s of shapes.values()) expect(s.length).toBeGreaterThan(0);
	});

	it('the map spans about 20 units wide', () => {
		const xs = [...cellShapes().values()].flat().flatMap((s) => s.getPoints().map((p) => p.x));
		expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(18);
		expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(21);
	});

	it('neighbouring cells share border segments', () => {
		const edges = sharedEdges();
		expect(edges.get('kaduna|kano')?.length).toBeGreaterThan(0);
	});

	it('maps SVG coordinates to centred world coordinates', () => {
		expect(toWorld([372, 300])).toEqual([0, 0]);
	});
});
