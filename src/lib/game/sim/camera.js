// @ts-nocheck
// Camera shots: a wide view of the whole map, cutting in on wars, secessions and inventions.
import cells from './data/cells.json';
import { INTRO, introCamera } from './intro.js';

const centroid = new Map(cells.map((c) => [c.id, c.centroid]));
const centre = cells.reduce((s, c) => [s[0] + c.centroid[0] / cells.length, s[1] + c.centroid[1] / cells.length], [0, 0]);
export const WIDE = { target: centre, zoom: 1 };
const HOLD = 4; // seconds a close shot is held
const EASE = 1.5;

/**
 * @param {import('./types.js').RunResult} run
 * @param {{ timeAt: (year: number) => number }} timeline
 * @returns {{ t: number, target: number[], zoom: number }[]}
 */
export function shotsFor(run, timeline) {
	const shots = [{ t: INTRO, ...WIDE }];
	for (const e of run.events) {
		if (!['war', 'secession', 'invention'].includes(e.kind)) continue;
		const cellId =
			e.cellIds?.[0] ??
			run.history.find((h) => h.year === e.year)?.polities.find((p) => p.id === e.polityIds?.[0])?.capitalCell;
		const target = centroid.get(cellId);
		if (!target) continue;
		const t = timeline.timeAt(e.year);
		if (t < shots.at(-1).t + HOLD) continue;
		shots.push({ t, target, zoom: 2.2 }, { t: t + HOLD, ...WIDE });
	}
	return shots;
}

const smooth = (x) => x * x * (3 - 2 * x);

/** Camera at playback time t: the globe intro first, then easing from the previous shot over EASE seconds. */
export function cameraAt(shots, t) {
	if (t < INTRO) return introCamera(t);
	let i = 0;
	while (i + 1 < shots.length && shots[i + 1].t <= t) i++;
	const cur = shots[i];
	const prev = shots[i - 1];
	if (!prev) return { target: cur.target, zoom: cur.zoom };
	const k = smooth(Math.min(1, (t - cur.t) / EASE));
	return {
		target: [prev.target[0] + (cur.target[0] - prev.target[0]) * k, prev.target[1] + (cur.target[1] - prev.target[1]) * k],
		zoom: prev.zoom + (cur.zoom - prev.zoom) * k
	};
}
