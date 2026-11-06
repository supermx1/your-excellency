// @ts-nocheck
// Web Worker wrapper: runs the engine off the main thread.
// Message in: { inputs, extraSeeds? }. Messages out: { type: 'result', run }, then { type: 'summary', ... }.
import { runSimulation } from './world.js';

const stats = (xs) => {
	const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
	if (!s.length) return null;
	const q = (p) => {
		const i = (s.length - 1) * p;
		const lo = Math.floor(i);
		return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
	};
	return { min: s[0], p10: q(0.1), median: q(0.5), p90: q(0.9), max: s.at(-1) };
};
const at2025 = (run) => run.history.find((y) => y.year === 2025) ?? run.history.at(-1);

// Keep only compact outcomes while generating extra seeds; retaining 50 full histories is costly on phones.
function outcomeFor(run) {
	return {
		endYear: run.history.at(-1).year,
		end: run.history.at(-1).totals,
		at2025: at2025(run).totals,
		war: run.events.some((e) => e.kind === 'war'),
		civil: run.events.some((e) => e.id === 'civil-war' || e.kind === 'secession'),
		nigeria: run.history.some((y) => y.polities.some((p) => p.id === 'nigeria'))
	};
}

function summarizeOutcomes(rows) {
	if (!rows.length || rows.some((r) => r.endYear !== rows[0].endYear))
		throw new Error('Ensemble runs must share an end year');
	return {
		runs: rows.length,
		endYear: rows[0].endYear,
		withWar: rows.filter((r) => r.war).length,
		withCivilWar: rows.filter((r) => r.civil).length,
		nigeriaFormed: rows.filter((r) => r.nigeria).length,
		pop2025: stats(rows.map((r) => r.at2025.pop)),
		litAny2025: stats(rows.map((r) => r.at2025.litAny)),
		outcomes: Object.fromEntries(
			Object.entries({
				population: 'pop',
				literacy: 'litAny',
				lifeExpectancy: 'lifeExp',
				income: 'incomePc'
			}).map(([label, key]) => [label, stats(rows.map((r) => r.end[key]))])
		)
	};
}

/** Counts outcomes across many runs of the same switches ("in 41 of 50 runs…"). */
export function summarize(runs) {
	return summarizeOutcomes(runs.map(outcomeFor));
}

export function handleMessage({ inputs, extraSeeds = 0 }, post) {
	try {
		post({ type: 'result', run: runSimulation(inputs) });
		if (!extraSeeds) return;
		const seed = Number(inputs.seed);
		const outcomes = [];
		for (let i = 0; i < extraSeeds; i++)
			outcomes.push(outcomeFor(runSimulation({ ...inputs, seed: seed + i + 1 })));
		post({ type: 'summary', ...summarizeOutcomes(outcomes) });
	} catch (err) {
		post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
	}
}

if (
	typeof self !== 'undefined' &&
	typeof self.postMessage === 'function' &&
	typeof window === 'undefined'
) {
	self.onmessage = (e) => handleMessage(e.data, (msg) => self.postMessage(msg));
}
