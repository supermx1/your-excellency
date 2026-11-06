// @ts-nocheck
// The opening dive from the globe into Nigeria and the closing pull-back. Pure functions of playback
// time, so the live view and video export get the same shots.
import { WIDE } from './camera.js';
import { NIGERIA_CENTRE } from './geo.js';

export const INTRO = 6;
export const OUTRO = 4;
const [LON, LAT] = NIGERIA_CENTRE;
const FAR = 4.5;
const NEAR = 1.35;

const smooth = (x) => {
	const k = Math.min(1, Math.max(0, x));
	return k * k * (3 - 2 * k);
};
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const globe = (lon, lat, distance, dip = 0, title = 0) => ({ mode: 'globe', globe: { lon, lat, distance, spin: 0 }, dip, title });
const diorama = (dip = 0) => ({ mode: 'diorama', target: WIDE.target, zoom: WIDE.zoom, dip, title: 0 });

/** Camera for playback time t in the intro (0–6 s): swing to West Africa, dive, dip to black, hand over. */
export function introCamera(t) {
	if (t < 2.5) {
		const k = smooth(t / 2.5);
		const title = Math.min(ramp(t, 0, 0.6), 1 - ramp(t, 2.0, 2.5));
		return globe(-30 + (LON + 30) * k, 15 + (LAT - 15) * k, FAR, 0, title);
	}
	if (t < 5.7) return globe(LON, LAT, FAR + (NEAR - FAR) * smooth((t - 2.5) / 2.9), ramp(t, 5.4, 5.7));
	return diorama(1 - ramp(t, 5.7, 6.0));
}

/** Camera s seconds after the last year (0–4 s): dip out of the diorama, then pull back from Nigeria. */
export function outroCamera(s) {
	if (s < 0.3) return diorama(ramp(s, 0, 0.3));
	return globe(LON, LAT, NEAR + (FAR - NEAR) * smooth((s - 0.6) / 3.4), 1 - ramp(s, 0.3, 0.6));
}
