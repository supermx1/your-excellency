// Every cutaway scene, drawn on the isometric street from the shot's progress and time only.
import { RAISED_SCENES } from './raised.js';
import { EVERYDAY_SCENES } from './everyday.js';

const SCENES = { ...RAISED_SCENES, ...EVERYDAY_SCENES };
const VIEW = [216, 270];
const OUTPUT_SCALE = 5;

/** Draws a shot entirely from its time, so backwards seeks produce the same frame. */
export function createTownView(canvas) {
	[canvas.width, canvas.height] = VIEW.map((size) => size * OUTPUT_SCALE);
	const ctx = canvas.getContext('2d', { alpha: false });
	ctx.imageSmoothingEnabled = false;
	return (shot) => {
		ctx.setTransform(OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0);
		(SCENES[shot.preset] ?? SCENES.market)(ctx, shot);
	};
}
