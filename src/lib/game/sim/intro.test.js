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

import { INTRO, OUTRO, introCamera, outroCamera } from './intro.js';
import { buildTimeline } from './timeline.js';
import { shotsFor, cameraAt, WIDE } from './camera.js';
import { runSimulation } from './world.js';

describe('intro and outro camera', () => {
	it('opens on the globe with the year card fading in', () => {
		expect(INTRO).toBe(6);
		expect(OUTRO).toBe(4);
		expect(introCamera(0)).toMatchObject({ mode: 'globe', title: 0 });
		expect(introCamera(1).title).toBe(1);
	});

	it('dips to black and hands over to the wide diorama shot at 6 s', () => {
		expect(introCamera(5.5).dip).toBeGreaterThan(0);
		expect(introCamera(6)).toMatchObject({ mode: 'diorama', dip: 0, target: WIDE.target, zoom: WIDE.zoom });
	});

	it('never jumps between frames', () => {
		for (let t = 0; t < 6; t += 1 / 30) {
			const a = introCamera(t);
			const b = introCamera(t + 1 / 30);
			expect(Math.abs(b.dip - a.dip)).toBeLessThan(0.2);
			if (a.globe && b.globe) expect(Math.abs(b.globe.distance - a.globe.distance)).toBeLessThan(0.2);
		}
	});

	it('ends the outro on the globe, pulled back', () => {
		expect(outroCamera(0)).toMatchObject({ mode: 'diorama', dip: 0 });
		expect(outroCamera(4)).toMatchObject({ mode: 'globe', dip: 0, globe: { distance: 4.5 } });
	});
});

describe('timeline with the intro', () => {
	const run = runSimulation({ seed: 1, startYear: 1950, endYear: 1970 });
	const plain = buildTimeline(run, { intro: 0 });
	const tl = buildTimeline(run);

	it('adds the intro to the duration and holds the start year through it', () => {
		expect(tl.duration).toBeCloseTo(plain.duration + INTRO, 9);
		expect(tl.yearAt(3)).toBe(1950);
		expect(tl.timeAt(1950)).toBe(INTRO);
	});

	it('seeking back into the intro returns the globe shot for that time', () => {
		expect(cameraAt(shotsFor(run, tl), 3)).toEqual(introCamera(3));
	});
});
