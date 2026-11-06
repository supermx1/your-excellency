// @ts-nocheck
// Narration chapters, the small digest of a chapter sent to the AI, its validation, and the
// built-in narration used when the AI is unavailable or over budget.
import { buildTimeline } from './timeline.js';
import { PRESETS } from './switches.js';
import { defaultData } from './data/index.js';

const MAX_CHAPTER = 25;
const KIND_ORDER = ['war', 'secession', 'union', 'invention', 'history', 'coup', 'peace', 'world'];
const FAMILY_KINDS = new Set([
	'hardship',
	'recovery',
	'electricity',
	'reads',
	'migrates',
	'war-death',
	'death',
	'child',
	'work'
]);
const LIMITS = { polities: 20, events: 25, ours: 5, families: 6, str: 160 };
const cut = (s) => String(s).slice(0, LIMITS.str);

/** Name of the preset whose switches all match, else "What if". */
export function scenarioLabel(inputs) {
	return (
		Object.values(PRESETS).find((p) =>
			Object.entries(p.switches).every(([k, v]) => inputs?.switches?.[k] === v)
		)?.label ?? 'What if'
	);
}

/** @param {import('./types.js').RunResult} run */
export function chaptersFor(run) {
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	const keys = buildTimeline(run).keyYears.filter((y) => y > start && y < end);
	const chapters = [];
	let from = start;
	while (from < end) {
		const to = Math.min(keys.find((k) => k > from) ?? end, from + MAX_CHAPTER, end);
		chapters.push({ index: chapters.length, from, to, title: `${from}–${to}` });
		from = to;
	}
	return chapters;
}

const totalsAt = (run, year) => {
	const t = (run.history.find((h) => h.year === year) ?? run.history.at(-1)).totals;
	return { pop: t.pop, litAny: t.litAny, lifeExp: t.lifeExp };
};

/** @param {import('./types.js').RunResult} run @param {{ from: number, to: number }} chapter */
export function digestChapter(run, { from, to }) {
	const inWindow = (y) => y >= from && y < to;
	const fired = new Set(run.events.map((e) => e.id).filter(Boolean));
	const rank = (e) => {
		const i = KIND_ORDER.indexOf(e.kind);
		return i < 0 ? KIND_ORDER.length : i;
	};
	const events = run.events
		.filter((e) => inWindow(e.year) && KIND_ORDER.includes(e.kind))
		.sort((a, b) => rank(a) - rank(b) || a.year - b.year)
		.slice(0, LIMITS.events)
		.map((e) => ({ year: e.year, kind: e.kind, title: cut(e.title) }));
	const ours = defaultData.events.events
		.filter((e) => e.kind === 'history' && inWindow(e.year) && !fired.has(e.id))
		.slice(0, LIMITS.ours)
		.map((e) => cut(`In our world: ${e.title}`));
	const families = run.families
		.flatMap((f) =>
			f.members.flatMap((m) =>
				m.lifeEvents
					.filter((e) => inWindow(e.year) && FAMILY_KINDS.has(e.kind))
					.map((e) => ({
						surname: cut(f.surname),
						member: cut(m.name),
						year: e.year,
						text: cut(`${m.name} ${f.surname} ${e.text}.`)
					}))
			)
		)
		.sort((a, b) => a.year - b.year)
		.slice(0, LIMITS.families);
	const snap = run.history.find((h) => h.year === to) ?? run.history.at(-1);
	return {
		scenario: cut(scenarioLabel(run.inputs)),
		from,
		to,
		totals: { start: totalsAt(run, from), end: totalsAt(run, to) },
		polities: snap.polities.slice(0, LIMITS.polities).map((p) => cut(p.name)),
		events,
		ours,
		families
	};
}

const isYear = (y) => Number.isInteger(y) && y >= 1850 && y <= 2100;
const isStr = (s) => typeof s === 'string' && s.length <= LIMITS.str;
const exactKeys = (o, keys) =>
	o &&
	typeof o === 'object' &&
	!Array.isArray(o) &&
	Object.keys(o).sort().join() === [...keys].sort().join();
const isTotals = (t) =>
	exactKeys(t, ['pop', 'litAny', 'lifeExp']) &&
	Object.values(t).every((v) => typeof v === 'number' && Number.isFinite(v));

/** @returns {{ ok: true, digest: object } | { ok: false, error: string }} */
export function validateDigest(d) {
	const bad = (error) => ({ ok: false, error });
	if (!exactKeys(d, ['scenario', 'from', 'to', 'totals', 'polities', 'events', 'ours', 'families']))
		return bad('unexpected fields');
	if (!isStr(d.scenario) || !isYear(d.from) || !isYear(d.to) || d.to <= d.from)
		return bad('bad chapter');
	if (
		!exactKeys(d.totals, ['start', 'end']) ||
		!isTotals(d.totals.start) ||
		!isTotals(d.totals.end)
	)
		return bad('bad totals');
	const list = (xs, max, ok) => Array.isArray(xs) && xs.length <= max && xs.every(ok);
	if (!list(d.polities, LIMITS.polities, isStr)) return bad('bad polities');
	if (
		!list(
			d.events,
			LIMITS.events,
			(e) =>
				exactKeys(e, ['year', 'kind', 'title']) && isYear(e.year) && isStr(e.kind) && isStr(e.title)
		)
	)
		return bad('bad events');
	if (!list(d.ours, LIMITS.ours, isStr)) return bad('bad ours');
	if (
		!list(
			d.families,
			LIMITS.families,
			(f) =>
				exactKeys(f, ['surname', 'member', 'year', 'text']) &&
				isStr(f.surname) &&
				isStr(f.member) &&
				isYear(f.year) &&
				isStr(f.text)
		)
	)
		return bad('bad families');
	return { ok: true, digest: d };
}

const millions = (n) => `${(n / 1e6).toFixed(1)} million`;

/** Built-in narration from the digest alone. */
export function fallbackNarration(d) {
	const top = d.events.slice(0, 3).map((e) => `${e.year}: ${e.title}.`);
	const growth = `Over these years the population goes from ${millions(d.totals.start.pop)} to ${millions(d.totals.end.pop)}, and ${Math.round(d.totals.end.litAny * 100)}% can read.`;
	const quiet = top.length ? '' : `${d.from} to ${d.to} passes without major upheaval.`;
	return {
		text: [quiet, ...top, growth].filter(Boolean).join(' '),
		vignettes: d.families.map((f) => f.text)
	};
}
