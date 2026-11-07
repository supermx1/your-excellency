// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches, PRESETS } from './switches.js';
import { shortScript, planShort, shortSceneAt } from './short.js';

const inputs = { seed: 5, switches: { ...defaultSwitches(), ...PRESETS.neverColonized.switches }, startYear: 1850, endYear: 2025 };
const run = runSimulation(inputs);
const summary = { runs: 50, nigeriaFormed: 0, withWar: 50 };
const beats = shortScript(run, inputs, summary);
const voices = beats.map((b, i) => ({ file: `audio/line-${i}.wav`, seconds: 4 + i }));
const plan = planShort(run, beats, voices);
const times = (n = 600) => Array.from({ length: n + 1 }, (_, i) => (plan.duration * i) / n);

describe('shortScript', () => {
	it('opens on the what-if and its years', () => {
		expect(beats[0].say).toBe('Britain never conquers the region. I ran Nigeria from 1850 to 2025.');
	});
	it('moves forward through the run, with one split screen and the result last', () => {
		for (const b of beats) expect(b.from).toBeLessThanOrEqual(b.to);
		for (let i = 1; i < beats.length; i++) expect(beats[i].from).toBeGreaterThanOrEqual(beats[i - 1].from);
		expect(beats.filter((b) => b.split).map((b) => b.to)).toEqual([1960]);
		expect(beats.at(-1).card).toBe(true);
		expect(beats.at(-1).say).toMatch(/In 50 runs, Nigeria formed zero times\.$/);
	});
	it('keeps a short run short: premise, what happened, result', () => {
		const r = runSimulation({ ...inputs, startYear: 2015 });
		const b = shortScript(r, { ...inputs, startYear: 2015 });
		expect(b.map((x) => (x.card ? 'card' : x.split ? 'split' : 'run'))).toEqual(['run', 'run', 'card']);
	});
});

describe('planShort', () => {
	it('gives each line its voice plus a breath, then holds on the result', () => {
		expect(plan.duration).toBeCloseTo(voices.reduce((s, v) => s + Math.max(2.5, v.seconds + 0.35), 0) + 3, 9);
		expect(plan.cues.map((c) => c.file)).toEqual(voices.map((v) => v.file));
		expect(plan.at(plan.duration).phase).toBe('card');
	});
	it('plays each line through its years, in order', () => {
		let last = -Infinity;
		for (const t of times()) {
			const a = plan.at(t);
			expect(a.year).toBeGreaterThanOrEqual(last - 1e-9);
			last = a.year;
		}
	});
	it('captions the line being said', () => {
		const first = plan.at(0.1).line;
		expect(beats[0].say.startsWith(first)).toBe(true);
	});
});

describe('shortSceneAt', () => {
	it('a split shows both worlds at the end of its year', () => {
		const t = times().find((x) => plan.at(x).phase === 'split');
		const s = shortSceneAt(run, plan, t, summary);
		expect(s.kicker).toBe('End of 1960');
		expect(s.frame.year).toBe(1961);
		expect(s.real.year).toBe(1961);
	});
	it('ends on the result card', () => {
		const s = shortSceneAt(run, plan, plan.duration, summary);
		expect(s.card.rows.map((r) => r.label)).toEqual(['Population', 'Wars', 'Biggest city']);
		expect(s.card.runs.theirs).toMatch(/0 formed a Nigeria/);
	});
});
