// @ts-nocheck
// Web Worker wrapper: runs the engine off the main thread.
// Message in: { inputs, extraSeeds? }. Messages out: { type: 'result', run }, then { type: 'summary', ... }.
import { runSimulation } from './world.js';

const stats = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	return { min: s[0], median: s[Math.floor(s.length / 2)], max: s.at(-1) };
};
const at2025 = (run) => run.history.find((y) => y.year === 2025) ?? run.history.at(-1);

/** Counts outcomes across many runs of the same switches ("in 41 of 50 runs…"). */
export function summarize(runs) {
	const has = (r, pred) => r.events.some(pred);
	return {
		runs: runs.length,
		withWar: runs.filter((r) => has(r, (e) => e.kind === 'war')).length,
		withCivilWar: runs.filter((r) => has(r, (e) => e.id === 'civil-war' || e.kind === 'secession')).length,
		nigeriaFormed: runs.filter((r) => r.history.some((y) => y.polities.some((p) => p.id === 'nigeria'))).length,
		pop2025: stats(runs.map((r) => at2025(r).totals.pop)),
		litAny2025: stats(runs.map((r) => at2025(r).totals.litAny))
	};
}

export function handleMessage({ inputs, extraSeeds = 0 }, post) {
	post({ type: 'result', run: runSimulation(inputs) });
	if (!extraSeeds) return;
	const runs = Array.from({ length: extraSeeds }, (_, i) => runSimulation({ ...inputs, seed: inputs.seed + i + 1 }));
	post({ type: 'summary', ...summarize(runs) });
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
	self.onmessage = (e) => handleMessage(e.data, (msg) => self.postMessage(msg));
}
