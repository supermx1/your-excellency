// @ts-nocheck
// Video export: video time ↔ playback time, and what each video frame shows. Pure functions, so the
// export page draws with the live view's own code and the same time always gives the same picture.
import { buildTimeline } from './timeline.js';
import { chaptersFor, scenarioLabel } from './narration.js';
import { INTRO, OUTRO, introCamera, outroCamera } from './intro.js';
import { cameraAt, WIDE } from './camera.js';
import { frameAt } from './frame.js';
import { realFrame, statsAt, captionsAt, familyCardsAt, endingRows } from './hud.js';
import { SWITCHES, PRESETS, defaultSwitches } from './switches.js';
import { speakable } from './kitten.js';
import { incomeDrivers } from './explanations.js';
import { defaultData } from './data/index.js';

const LEVEL = { low: 'low', history: 'as in history', high: 'high', off: 'off', likely: 'more likely', secular: 'secular', choose: 'each state chooses' };

/** What the viewer needs before the run starts: which what-if, which years, what was switched. */
export function scenarioCard(inputs) {
	const label = scenarioLabel(inputs);
	const preset = Object.values(PRESETS).find((p) => p.label === label);
	const def = defaultSwitches();
	const value = (s, v) =>
		s.type === 'bool' ? (v ? 'on' : 'off') : s.type === 'number' ? `×${v}` : s.type === 'year' ? (v ?? (s.default ? 'never' : 'as in history')) : LEVEL[v] ?? v;
	const changes = Object.entries(SWITCHES)
		.filter(([k]) => inputs.switches[k] !== def[k])
		.map(([k, s]) => ({ label: s.label, value: value(s, inputs.switches[k]) }));
	const spokenChanges = changes.length ? `Changed from history: ${changes.map((c) => `${c.label}, ${c.value}`).join('; ')}.` : 'Every switch is as in history.';
	return {
		label,
		description: preset?.description ?? null,
		from: inputs.startYear,
		to: inputs.endYear,
		changes,
		spoken: [label === 'What if' ? 'What if.' : `${label}.`, preset?.description ?? '', `Nigeria, from ${inputs.startYear} to ${inputs.endYear}.`, spokenChanges]
			.filter(Boolean)
			.join(' ')
	};
}

/** Narration cut into short captions (a few words each), timed by how long each takes to say. */
export function captionChunks(text, seconds) {
	const words = text.split(/\s+/).filter(Boolean);
	const chunks = [];
	let cur = [];
	for (const w of words) {
		cur.push(w);
		const end = /[.!?;:,]$/.test(w);
		if ((end && cur.length >= 4) || /[.!?]$/.test(w) || cur.length >= 10) {
			chunks.push(cur.join(' '));
			cur = [];
		}
	}
	if (cur.length) chunks.push(cur.join(' '));
	const weights = chunks.map((c) => speakable(c).length + 6); // + a beat for the pause between phrases
	const total = weights.reduce((a, b) => a + b, 0);
	let t = 0;
	return chunks.map((c, i) => {
		const start = t;
		t += (seconds * weights[i]) / total;
		return { text: c, start, end: t };
	});
}

/**
 * Lays the video out: the scenario card, the globe intro, each chapter in [from, to] stretched so its
 * narration fits, a hold at the end of each split year, the outro, then the result cards.
 * @param {import('./types.js').RunResult} run
 * @param {{ from?: number, to?: number, splits?: number[], audio?: Record<string, number>, texts?: Record<string, string>,
 *   summary?: object | null, splitSeconds?: number, gap?: number, titleSeconds?: number }} [opts]
 */
export function planExport(
	run,
	{ from, to, splits, audio = {}, texts = {}, summary = null, splitSeconds = 4, gap = 0.8, titleSeconds = 6 } = {}
) {
	const timeline = buildTimeline(run);
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	from = Math.max(start, from ?? start);
	to = Math.min(end, to ?? end);
	if (from >= to) throw new RangeError(`from (${from}) must be before to (${to})`);
	// A split shows the end of its year, so the year must finish inside the range; none on the first
	// year, before anything has happened.
	const holds = (splits ?? timeline.keyYears).filter((y) => y > from && y + 1 <= to);

	const segments = [];
	const cues = [];
	const chapters = [];
	let v = 0;
	const push = (seg, length) => {
		segments.push({ ...seg, v0: v, v1: v + length });
		v += length;
	};

	if (audio.title) cues.push({ chapter: 'title', start: 0, seconds: audio.title });
	push({ p0: 0, p1: 0, phase: 'title', year: from }, Math.max(titleSeconds, (audio.title ?? 0) + gap));
	push({ p0: 0, p1: INTRO, phase: 'intro', year: from }, INTRO);

	for (const c of chaptersFor(run)) {
		const a = Math.max(c.from, from);
		const b = Math.min(c.to, to);
		if (a >= b) continue;
		const p0 = timeline.timeAt(a);
		const p1 = timeline.timeAt(b);
		const mine = holds.filter((y) => y >= a && y + 1 <= b);
		const seconds = audio[c.index];
		const v0 = v;
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
		chapters.push({ index: c.index, from: c.from, to: c.to, v0, v1: v, captions: texts[c.index] && seconds ? captionChunks(texts[c.index], seconds) : [] });
	}
	push({ p0: timeline.duration, p1: timeline.duration + OUTRO, phase: 'outro', year: to }, OUTRO);
	const still = { p0: timeline.duration + OUTRO, p1: timeline.duration + OUTRO, year: to };
	push({ ...still, phase: 'ending' }, 9);
	if (summary?.outcomes && summary.endYear === to) push({ ...still, phase: 'range' }, 8);
	push({ ...still, phase: 'shaped' }, 10);

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
	return { duration, cues, chapters, at, from, to, timeline, summary };
}

const RANGES = [
	['Population', 'pop', 'population'],
	['Can read (school)', 'litSchool', 'literacy'],
	['Can read (any script)', 'litAny', 'literacyAny'],
	['Life expectancy', 'lifeExp', 'lifeExpectancy']
];

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
		phase === 'intro' || phase === 'title' ? introCamera(play) : phase === 'run' ? cameraAt(shots, play) : phase === 'outro' ? outroCamera(since) : { mode: 'diorama', ...WIDE };
	const all = captionsAt(run, phase === 'split' ? year + 0.99 : year, phase === 'split' ? 1 : 1.5);
	const own = all.find((c) => c.title);
	const ours = all.find((c) => c.ours)?.ours;
	const chapter = plan.chapters.find((c) => time >= c.v0 && time < c.v1) ?? null;
	const line = chapter?.captions.find((c) => time - chapter.v0 >= c.start && time - chapter.v0 < c.end);
	const last = run.history.at(-1);
	const biggest = last.cells.reduce((a, b) => (b.urban * b.pop > a.urban * a.pop ? b : a));
	return {
		phase,
		year,
		camera,
		frame: frameAt(run, shown),
		real: phase === 'split' ? realFrame(shown) : null,
		stats: statsAt(run, national, shown),
		caption: own || ours ? { year: own?.year ?? year, title: own?.title, ours } : null,
		families: phase === 'run' ? familyCardsAt(run, year) : [],
		subtitle: chapter && (phase === 'run' || phase === 'split') ? { kicker: `Chapter ${chapter.index + 1} · ${chapter.from}–${chapter.to}`, text: line?.text ?? null } : null,
		ending: phase === 'ending' ? endingRows(run, national, plan.summary) : null,
		ranges:
			phase === 'range'
				? { runs: plan.summary.runs, endYear: plan.summary.endYear, rows: RANGES.filter(([, , k]) => plan.summary.outcomes[k]).map(([label, key, k]) => ({ label, key, ...plan.summary.outcomes[k] })) }
				: null,
		shaped:
			phase === 'shaped'
				? { name: defaultData.cells.find((c) => c.id === biggest.id)?.name ?? biggest.id, year: last.year, income: biggest.incomePc, drivers: incomeDrivers(biggest) }
				: null
	};
}
