// @ts-nocheck
// Shorts: a ~40 s vertical map clip in the owner's voice, which he plays and reacts to in Cap.
// shortScript drafts the lines from a run (he can edit them before they are voiced); planShort times
// each line's years to its audio; shortSceneAt says what each frame shows. Pure functions.
import { scenarioCard, captionChunks } from './export.js';
import { frameAt } from './frame.js';
import { realFrame, statsAt, captionsAt, endingRows } from './hud.js';
import { defaultData } from './data/index.js';

const NOTABLE = ['union', 'secession', 'conquest', 'history', 'coup', 'war']; // what makes a line, best first
const snap = (run, y) => run.history.find((h) => h.year === y) ?? run.history.at(-1);
const people = (n) =>
	n >= 1e6 ? `${Math.round(n / 1e6)} million` : `${Math.round(n / 1e3)} thousand`;
const stat = (run, y, key) => statsAt(run, defaultData.national, y).find((s) => s.key === key);
const warsBy = (run, y) => run.events.filter((e) => e.kind === 'war' && e.year <= y).length;
const standout = (run, a, b) => {
	for (const kind of NOTABLE) {
		const e = run.events.find(
			(x) => x.kind === kind && x.year > a && x.year <= b && (kind !== 'conquest' || x.annexed)
		); // a whole state falling, not one battle
		if (e) return `${e.year}: ${e.title}. `;
	}
	return '';
};
const statesAt = (run, y) => {
	const p = snap(run, y).polities;
	return p.length === 1 ? `${p[0].name} rules it all` : `${p.length} states share the land`;
};

/**
 * The draft script: one line per beat, each playing a stretch of years. Saved as JSON for the owner to edit.
 * @returns {{ say: string, from: number, to: number, split?: boolean, card?: boolean }[]}
 */
export function shortScript(run, inputs, summary = null) {
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	const card = scenarioCard(inputs);
	const premise = card.description
		? card.description.split('. ')[0].replace(/\.?$/, '.')
		: card.changes.length
			? `I changed ${card.changes.map((c) => `${c.label.toLowerCase()} to ${c.value}`).join(', ')}.`
			: 'Every switch as in history.';
	const beats = [
		{ say: `${premise} I ran Nigeria from ${start} to ${end}.`, from: start, to: start }
	];

	if (end - start >= 30) {
		const c1 = start + 10 < 1914 && 1914 < end - 20 ? 1914 : start + Math.round((end - start) / 3);
		const c2 = c1 + 10 < 1960 && 1960 < end - 10 ? 1960 : c1 + Math.round((end - c1) / 2);
		beats.push({
			say: `${standout(run, start, c1)}By ${c1}, ${statesAt(run, c1)}, after ${warsBy(run, c1)} wars.`,
			from: start,
			to: c1
		});
		beats.push({
			say: `${standout(run, c1, c2)}By ${c2}, ${people(snap(run, c2).totals.pop)} people.`,
			from: c1,
			to: c2
		});
		const ours = captionsAt(run, c2 + 0.99, 1)
			.find((c) => c.ours)
			?.ours?.replace('In our world: ', '');
		const nigeria = snap(run, c2 + 1).polities.some((p) => /nigeria/i.test(p.name));
		beats.push({
			say: `${ours ? `In our world, ${ours.replace(/\.$/, '')}.` : 'Our world on top, theirs below.'} Here, ${nigeria ? 'Nigeria stands too' : 'there is no Nigeria'}.`,
			from: c2,
			to: c2,
			split: true
		});
		beats.push({
			say: `${standout(run, c2, end)}By ${end}, ${warsBy(run, end)} wars. Ours had ${stat(run, end, 'wars').ours}.`,
			from: c2,
			to: end
		});
	} else {
		beats.push({
			say: `${standout(run, start, end)}By ${end}, ${warsBy(run, end)} wars.`,
			from: start,
			to: end
		});
	}

	const rows = endingRows(run, defaultData.national, summary);
	const city = rows.find((r) => r.label === 'Biggest city').theirs;
	const pop = stat(run, end, 'pop');
	beats.push({
		say: `${people(pop.value)} people, against ${people(pop.ours)} in ours. ${city}${city === 'Lagos' ? ' is still' : ', not Lagos, is'} the biggest city.${summary ? ` In ${summary.runs} runs, Nigeria formed ${times(summary.nigeriaFormed)}.` : ''}`,
		from: end,
		to: end,
		card: true
	});
	return beats;
}

const times = (n) => (n === 0 ? 'zero times' : n === 1 ? 'once' : `${n} times`);
const ease = (k) => k * k * (3 - 2 * k);

/**
 * Times the beats to their voice clips.
 * @param {ReturnType<typeof shortScript>} beats @param {{ file: string, seconds: number }[]} voices one per beat
 */
export function planShort(run, beats, voices, { gap = 0.35, minBeat = 2.5, endHold = 3 } = {}) {
	const end = run.history.at(-1).year;
	const segments = [];
	const cues = [];
	let v = 0;
	beats.forEach((b, i) => {
		const seconds = voices[i]?.seconds ?? 0;
		const length = Math.max(minBeat, seconds + gap);
		if (seconds) cues.push({ id: `line-${i}`, file: voices[i].file, start: v, seconds });
		segments.push({
			...b,
			beat: i,
			v0: v,
			v1: v + length,
			phase: b.card ? 'card' : b.split ? 'split' : 'run',
			captions: seconds ? captionChunks(b.say, seconds) : []
		});
		v += length;
	});
	segments.push({
		from: end,
		to: end,
		beat: null,
		v0: v,
		v1: v + endHold,
		phase: 'card',
		captions: []
	});
	const duration = v + endHold;
	const at = (time) => {
		const t = Math.min(duration, Math.max(0, time));
		const s = segments.findLast((x) => x.v0 <= t) ?? segments[0];
		const k = s.v1 > s.v0 ? Math.min(1, (t - s.v0) / (s.v1 - s.v0)) : 1;
		const year = s.phase === 'run' ? s.from + (s.to - s.from) * ease(k) : s.to;
		const line = s.captions.find((c) => t - s.v0 >= c.start && t - s.v0 < c.end)?.text ?? null;
		return { phase: s.phase, year, line };
	};
	return { duration, cues, segments, at };
}

/** What one frame of the Short shows. */
export function shortSceneAt(run, plan, time, summary = null) {
	const { phase, year, line } = plan.at(time);
	const shown = phase === 'split' ? year + 1 : year; // a split shows the end of its year
	const pick = (key) => stat(run, shown, key);
	const rows = phase === 'card' ? endingRows(run, defaultData.national, summary) : null;
	return {
		phase,
		year: Math.floor(year),
		frame: frameAt(run, shown),
		real: phase === 'split' ? realFrame(shown) : null,
		kicker: phase === 'split' ? `End of ${year}` : null,
		line,
		stats: [pick('pop'), pick('wars')],
		card: rows && {
			rows: ['Population', 'Wars', 'Biggest city'].map((l) => rows.find((r) => r.label === l)),
			runs: rows.find((r) => r.label.startsWith('In '))
		}
	};
}
