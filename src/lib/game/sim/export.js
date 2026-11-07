// @ts-nocheck
// Video export: video time ↔ playback time, and what each video frame shows. Pure functions, so the
// export page draws with the live view's own code and the same time always gives the same picture.
import { buildTimeline } from './timeline.js';
import { chaptersFor } from './narration.js';
import { INTRO, OUTRO, introCamera, outroCamera } from './intro.js';
import { cameraAt, WIDE } from './camera.js';
import { frameAt } from './frame.js';
import { realFrame, statsAt, captionsAt, familyCardsAt, endingRows } from './hud.js';

/**
 * Lays the video out: the globe intro, each chapter in [from, to] stretched so its narration fits,
 * a hold at the end of each split year, the outro, then the ending card.
 * @param {import('./types.js').RunResult} run
 * @param {{ from?: number, to?: number, splits?: number[], audio?: Record<number, number>,
 *   splitSeconds?: number, gap?: number, endingSeconds?: number }} [opts]
 */
export function planExport(run, { from, to, splits, audio = {}, splitSeconds = 4, gap = 0.8, endingSeconds = 8 } = {}) {
	const timeline = buildTimeline(run);
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	from = Math.max(start, from ?? start);
	to = Math.min(end, to ?? end);
	if (from >= to) throw new RangeError(`from (${from}) must be before to (${to})`);
	// A split shows the end of its year, so the year must finish inside the range.
	const holds = (splits ?? timeline.keyYears).filter((y) => y >= from && y + 1 <= to);

	const segments = [{ v0: 0, v1: INTRO, p0: 0, p1: INTRO, phase: 'intro', year: from }];
	const cues = [];
	let v = INTRO;
	const push = (seg, length) => {
		segments.push({ ...seg, v0: v, v1: v + length });
		v += length;
	};

	for (const c of chaptersFor(run)) {
		const a = Math.max(c.from, from);
		const b = Math.min(c.to, to);
		if (a >= b) continue;
		const p0 = timeline.timeAt(a);
		const p1 = timeline.timeAt(b);
		const mine = holds.filter((y) => y >= a && y + 1 <= b);
		const seconds = audio[c.index];
		if (seconds) cues.push({ chapter: c.index, start: v, seconds });
		const moving = Math.max(p1 - p0, seconds ? seconds + gap - mine.length * splitSeconds : 0);
		const scale = moving / (p1 - p0);
		let p = p0;
		for (const y of mine) {
			const hold = timeline.timeAt(y + 1);
			if (hold > p) push({ p0: p, p1: hold, phase: 'run' }, (hold - p) * scale);
			push({ p0: hold, p1: hold, phase: 'split', year: y }, splitSeconds);
			p = hold;
		}
		if (p1 > p) push({ p0: p, p1, phase: 'run' }, (p1 - p) * scale);
	}
	push({ p0: timeline.duration, p1: timeline.duration + OUTRO, phase: 'outro', year: to }, OUTRO);
	push({ p0: timeline.duration + OUTRO, p1: timeline.duration + OUTRO, phase: 'ending', year: to }, endingSeconds);

	const duration = v;
	/** @param {number} time video seconds */
	const at = (time) => {
		const t = Math.min(duration, Math.max(0, time));
		let lo = 0;
		let hi = segments.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (segments[mid].v0 <= t) lo = mid;
			else hi = mid - 1;
		}
		const s = segments[lo];
		const k = s.v1 > s.v0 ? (t - s.v0) / (s.v1 - s.v0) : 0;
		const play = s.p0 + (s.p1 - s.p0) * k;
		const year = s.phase === 'run' ? timeline.yearAt(play) : s.year;
		return { play, year, phase: s.phase, since: t - s.v0 };
	};
	return { duration, cues, at, from, to, timeline };
}

/**
 * Everything one video frame shows.
 * @param {import('./types.js').RunResult} run @param {ReturnType<typeof planExport>} plan
 * @param {ReturnType<typeof import('./camera.js').shotsFor>} shots @param {number} time
 * @param {object} national
 */
export function sceneAt(run, plan, shots, time, national) {
	const { play, year, phase, since } = plan.at(time);
	// A split shows the end of its year, as the live view does.
	const shown = phase === 'split' ? year + 1 : year;
	const camera =
		phase === 'intro' ? introCamera(play) : phase === 'run' ? cameraAt(shots, play) : phase === 'outro' ? outroCamera(since) : { mode: 'diorama', ...WIDE };
	const all = captionsAt(run, phase === 'split' ? year + 0.99 : year, phase === 'split' ? 1 : 1.5);
	const own = all.find((c) => c.title);
	const ours = all.find((c) => c.ours)?.ours;
	return {
		phase,
		year,
		camera,
		frame: frameAt(run, shown),
		real: phase === 'split' ? realFrame(shown) : null,
		stats: statsAt(run, national, shown),
		caption: own || ours ? { year: own?.year ?? year, title: own?.title, ours } : null,
		families: phase === 'run' ? familyCardsAt(run, year) : [],
		ending: phase === 'ending' ? endingRows(run, national, null) : null
	};
}
