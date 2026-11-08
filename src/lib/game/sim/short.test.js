// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches, PRESETS } from './switches.js';
import { shortScript, planShort, shortSceneAt, shortLabel } from './short.js';

const inputs = {
	seed: 5,
	switches: { ...defaultSwitches(), ...PRESETS.neverColonized.switches },
	startYear: 1850,
	endYear: 2025
};
const run = runSimulation(inputs);
const summary = { runs: 50, nigeriaFormed: 0, withWar: 50 };
const beats = shortScript(run, inputs, summary);
const townBeats = shortScript(run, inputs, summary, { town: true });
const voices = beats.map((b, i) => ({ file: `audio/line-${i}.wav`, seconds: 4 + i }));
const plan = planShort(run, beats, voices);
const times = (n = 600) => Array.from({ length: n + 1 }, (_, i) => (plan.duration * i) / n);

describe('shortScript', () => {
	it('opens on the what-if and its years', () => {
		expect(beats[0].say).toBe(
			'Britain never conquers the region. I ran Nigeria from 1850 to 2025.'
		);
	});
	it('names every what-if it combines, then any other switch changed', () => {
		const both = {
			...inputs,
			switches: { ...inputs.switches, ...PRESETS.genius.switches },
			endYear: 2100
		};
		expect(shortScript(run, both)[0].say).toBe(
			'Britain never conquers the region. Everyone learns and invents three times faster. I ran Nigeria from 1850 to 2025.'
		);
		const more = { ...inputs, switches: { ...inputs.switches, coups: 'off' } };
		expect(shortScript(run, more)[0].say).toBe(
			'Britain never conquers the region. I changed military coups to off. I ran Nigeria from 1850 to 2025.'
		);
	});
	it('moves forward through the run, with one split screen and the result last', () => {
		for (const b of beats) expect(b.from).toBeLessThanOrEqual(b.to);
		for (let i = 1; i < beats.length; i++)
			expect(beats[i].from).toBeGreaterThanOrEqual(beats[i - 1].from);
		expect(beats.filter((b) => b.split).map((b) => b.to)).toEqual([1960]);
		expect(beats.at(-1).card).toBe(true);
		expect(beats.at(-1).say).toMatch(/In 50 runs, Nigeria formed zero times\.$/);
	});
	it('keeps a short run short: premise, what happened, result', () => {
		const r = runSimulation({ ...inputs, startYear: 2015 });
		const b = shortScript(r, { ...inputs, startYear: 2015 });
		expect(b.map((x) => (x.card ? 'card' : x.split ? 'split' : 'run'))).toEqual([
			'run',
			'run',
			'card'
		]);
	});
	it('drafts the station shot from a railway event in the run', () => {
		expect(beats.some((beat) => beat.town)).toBe(false);
		const b = townBeats.find((beat) => beat.town);
		const event = run.events[b.town.event];
		expect(event.techId).toBe('railway');
		expect(event.year).toBeGreaterThan(b.from);
		expect(event.year).toBeLessThanOrEqual(b.to);
		expect(b.say).toContain(event.title);
		const gap = 1898 - event.year; // our first railway in Nigeria
		expect(b.say).toContain(
			gap > 0 ? `${gap} years before ours` : gap < 0 ? `${-gap} years after ours` : event.title
		);
	});
	it("cuts away to the run's biggest world firsts: at most 3, one per scene, in year order", () => {
		const genius = { ...inputs, switches: { ...inputs.switches, learning: 3 }, endYear: 2100 };
		const r = runSimulation(genius);
		const cut = shortScript(r, genius, summary, { town: true }).filter(
			(b) => b.town && b.town.preset !== 'station'
		);
		expect(cut.length).toBeGreaterThan(0);
		expect(cut.length).toBeLessThanOrEqual(3);
		expect(new Set(cut.map((b) => b.town.preset)).size).toBe(cut.length);
		const events = cut.map((b) => r.events[b.town.event]);
		for (const [i, e] of events.entries()) {
			expect(e).toMatchObject({ kind: 'invention', worldFirst: true });
			expect(cut[i].say.startsWith(`${e.year}: `)).toBe(true);
			expect(cut[i].say).toMatch(/years before ours\.|Nobody in our world has done that yet\./);
			if (i) expect(e.year).toBeGreaterThanOrEqual(events[i - 1].year);
		}
		expect(
			events.some((e) => ['crewed-spaceflight', 'moon-base', 'mars-landing'].includes(e.techId))
		).toBe(true);
		// Each shot carries what the page needs: the state's colour and what it had built by then.
		const all = shortScript(r, genius, summary, { town: true });
		const p = planShort(
			r,
			all,
			all.map((_, i) => ({ file: `audio/${i}.wav`, seconds: 4 })),
			{ town: true }
		);
		const shots = p.segments
			.filter((sg) => sg.town && sg.town.preset !== 'station')
			.map((sg) => sg.town);
		for (const shot of shots) {
			expect(shot.color).toMatch(/^#[0-9a-f]{6}$/);
			expect(shot.techs).toContain(shot.tech);
		}
		expect(shortScript(r, genius, summary).some((b) => b.town)).toBe(false);
	});
	it('labels the Short with every what-if it combines', () => {
		expect(shortLabel(inputs)).toBe('Never colonized');
		expect(shortLabel({ ...inputs, switches: { ...inputs.switches, learning: 3 } })).toBe(
			'Never colonized + 200 IQ'
		);
		expect(shortLabel({ ...inputs, switches: defaultSwitches() })).toBe('What if');
	});
});

describe('planShort', () => {
	it('gives each line its voice plus a breath, then holds on the result', () => {
		expect(plan.duration).toBeCloseTo(
			voices.reduce((s, v) => s + Math.max(2.5, v.seconds + 0.35), 0) + 3,
			9
		);
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
	it('cuts to the configured town only within its window', () => {
		const tuned = townBeats.map((b) =>
			b.town ? { ...b, town: { ...b.town, preset: 'market', start: 0.2, end: 0.7, crowd: 5 } } : b
		);
		const tunedVoices = tuned.map((b, i) => ({ file: `audio/line-${i}.wav`, seconds: 4 + i }));
		const planned = planShort(run, tuned, tunedVoices, { town: true });
		const { town } = planned.segments.find((s) => s.town);
		const middle = (town.in + town.out) / 2;
		const shot = shortSceneAt(run, planned, middle, summary);
		expect(shot.phase).toBe('town');
		expect(shot.town).toMatchObject({
			preset: 'market',
			crowd: 5,
			year: town.year,
			title: town.title
		});
		expect(shot.town.progress).toBeCloseTo(0.5);
		expect(shortSceneAt(run, planned, town.out, summary).phase).toBe('run');
		expect(shortSceneAt(run, planned, town.in - 0.01, summary).phase).toBe('run');
		expect(shortSceneAt(run, planned, middle, summary)).toEqual(shot);
		expect(shortSceneAt(run, planShort(run, tuned, tunedVoices), middle, summary).phase).toBe(
			'run'
		);
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
