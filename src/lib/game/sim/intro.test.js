// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { lonLatToVec3 } from '$lib/components/sim/diorama/globe.js';

const close = (a, b) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));

describe('lonLatToVec3', () => {
	it('puts (0,0) towards +z, (90,0) towards +x and the north pole up', () => {
		close(lonLatToVec3(0, 0, 1), [0, 0, 1]);
		close(lonLatToVec3(90, 0, 1), [1, 0, 0]);
		close(lonLatToVec3(0, 90, 1), [0, 1, 0]);
	});
});
