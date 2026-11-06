// @ts-nocheck
// Playback time ↔ fractional year. Quiet years zip past; years with events slow down. The first
// `intro` seconds are the globe opening, held on the start year.
import { INTRO } from './intro.js';

const EVENT_KINDS = new Set(['war', 'peace', 'secession', 'union', 'coup', 'invention', 'history']);
const FAMILY_KINDS = new Set([
	'born',
	'death',
	'war-death',
	'reads',
	'hardship',
	'recovery',
	'electricity'
]);

/** @param {import('./types.js').RunResult} run */
export function buildTimeline(
	run,
	{ quietSecondsPerYear = 0.35, eventSecondsPerYear = 2.5, intro = INTRO } = {}
) {
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	const busy = new Set(run.events.filter((e) => EVENT_KINDS.has(e.kind)).map((e) => e.year));
	for (const f of run.families)
		for (const m of f.members)
			for (const e of m.lifeEvents) if (FAMILY_KINDS.has(e.kind)) busy.add(e.year);

	const lengths = [];
	for (let y = start; y < end; y++)
		lengths.push(busy.has(y) ? eventSecondsPerYear : quietSecondsPerYear);
	const prefix = [intro];
	for (const l of lengths) prefix.push(prefix.at(-1) + l);
	const duration = prefix.at(-1);

	const yearAt = (t) => {
		if (t <= intro) return start;
		if (t >= duration) return end;
		let lo = 0;
		let hi = lengths.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (prefix[mid] <= t) lo = mid;
			else hi = mid - 1;
		}
		return start + lo + (t - prefix[lo]) / lengths[lo];
	};
	const timeAt = (year) => {
		const y = Math.min(end, Math.max(start, year));
		const i = Math.min(lengths.length - 1, Math.floor(y - start));
		return y >= end ? duration : prefix[i] + (y - start - i) * lengths[i];
	};

	const key = new Set([start, ...[1914, 1960, 1967, 2025].filter((y) => y > start && y <= end)]);
	for (const e of run.events) {
		if (
			e.kind === 'secession' ||
			e.kind === 'union' ||
			(e.kind === 'invention' && e.aheadOfReal > 10)
		)
			key.add(e.year);
	}
	return { duration, yearAt, timeAt, keyYears: [...key].sort((a, b) => a - b) };
}

/** A playback clock; tick() takes real seconds since the last frame and returns playback time. */
export function createClock() {
	return {
		t: 0,
		playing: false,
		speed: 1,
		tick(delta) {
			if (this.playing) this.t += Math.min(Math.max(delta, 0), 0.25) * this.speed;
			return this.t;
		},
		set(t) {
			this.t = Math.max(0, t);
		}
	};
}
