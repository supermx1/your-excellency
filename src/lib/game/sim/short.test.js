import { polityColor } from './colors.js';
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
			'Britain never conquers the region. I set military coups to off. I ran Nigeria from 1850 to 2025.'
		);
		const power = { ...inputs, switches: { ...inputs.switches, power24hFromYear: 1960 } };
		expect(shortScript(run, power)[0].say).toContain('I set 24-hour power from 1960.');
	});
	it('moves forward through the run, with one split screen and the result last', () => {
		for (const b of beats) expect(b.from).toBeLessThanOrEqual(b.to);
		for (let i = 1; i < beats.length; i++)
			expect(beats[i].from).toBeGreaterThanOrEqual(beats[i - 1].from);
		expect(beats.filter((b) => b.split).map((b) => b.to)).toEqual([1960]);
		expect(beats.at(-1).card).toBe(true);
		expect(beats.at(-1).say).toMatch(
			/I ran this world 50 times, and Nigeria never formed\. Not once\.$/
		);
		const said = (n) => shortScript(run, inputs, { ...summary, nigeriaFormed: n }).at(-1).say;
		expect(said(1)).toMatch(/Nigeria formed only once\.$/);
		expect(said(12)).toMatch(/Nigeria formed in 12 of them\.$/);
		expect(said(50)).toMatch(/Nigeria formed every time\.$/);
		// A civil war count only when Nigeria formed somewhere: with no Nigeria it reads as a contradiction.
		expect(shortScript(run, inputs, { ...summary, withCivilWar: 1 }).at(-1).say).toMatch(
			/Nigeria never formed\. Not once\.$/
		);
		const civil = shortScript(run, inputs, { ...summary, nigeriaFormed: 50, withCivilWar: 2 }).at(
			-1
		).say;
		expect(civil).toMatch(/I ran this world 50 times, and a civil war broke out in 2 of them\.$/);
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
	it('without families, drafts the station shot from a railway event in the run', () => {
		expect(beats.some((beat) => beat.town)).toBe(false);
		const b = shortScript({ ...run, families: [] }, inputs, summary, { town: true }).find(
			(beat) => beat.town?.preset === 'station'
		);
		const event = run.events[b.town.event];
		expect(event.techId).toBe('railway');
		expect(event.year).toBeGreaterThan(b.from);
		expect(event.year).toBeLessThanOrEqual(b.to);
		expect(b.say).toContain(event.title);
		const gap = 1898 - event.year; // our first railway in Nigeria
		expect(b.say).toContain(
			gap > 0
				? `${gap} years before Nigeria's first railway in our world`
				: gap < 0
					? `${-gap} years after Nigeria's first railway in our world`
					: event.title
		);
	});
	it('without families, mixes world firsts with everyday scenes, one per preset and in year order', () => {
		const genius = { ...inputs, switches: { ...inputs.switches, learning: 3 }, endYear: 2100 };
		const r = { ...runSimulation(genius), families: [] };
		const cut = shortScript(r, genius, summary, { town: true }).filter(
			(b) => b.town && b.town.preset !== 'station'
		);
		expect(cut.length).toBeGreaterThan(0);
		expect(cut.length).toBeLessThanOrEqual(3);
		expect(new Set(cut.map((b) => b.town.preset)).size).toBe(cut.length);
		for (let i = 1; i < cut.length; i++) expect(cut[i].to).toBeGreaterThan(cut[i - 1].to);
		// Radio, television and internet shots say the event's own title, world first or not.
		const inventions = cut.filter(
			(b) =>
				r.events[b.town.event]?.worldFirst && !['broadcast', 'internet'].includes(b.town.preset)
		);
		const events = inventions.map((b) => r.events[b.town.event]);
		for (const [i, e] of events.entries()) {
			expect(e).toMatchObject({ kind: 'invention', worldFirst: true });
			expect(inventions[i].say.startsWith(`${e.year}: `)).toBe(true);
			expect(inventions[i].say).toMatch(
				/years before anyone in our world did it\.|Nobody in our world has done that yet\./
			);
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
			if (shot.tech) expect(shot.techs).toContain(shot.tech);
		}
		expect(shortScript(r, genius, summary).some((b) => b.town)).toBe(false);
	});
	it('follows one family through the Short, introduced once, generation by generation', () => {
		const cut = townBeats.filter((b) => b.town);
		const family = cut.filter((b) => b.town.familyEvent);
		expect(family.length).toBeGreaterThanOrEqual(2);
		expect(family.length).toBeLessThanOrEqual(3);
		expect(cut.length - family.length).toBeLessThanOrEqual(1); // at most one other scene
		const f = family[0].town.familyEvent[0];
		expect(family.every((b) => b.town.familyEvent[0] === f)).toBe(true);
		const { surname, members } = run.families[f];
		const moment = (b) => {
			const [, m, i] = b.town.familyEvent;
			return { m, member: members[m], event: members[m].lifeEvents[i] };
		};
		const first = moment(family[0]);
		expect(family[0].say).toMatch(
			new RegExp(`^${first.event.year}: Meet the ${surname} family of [^.]+\\. `)
		);
		expect(family[0].say).toContain(`${first.member.name} ${surname} ${first.event.text}.`);
		for (let k = 1; k < family.length; k++) {
			const [prev, now] = [moment(family[k - 1]), moment(family[k])];
			if (now.m > prev.m) expect(family[k].say).toContain(`${prev.member.name}'s `);
			expect(family[k].say).toContain(now.event.text);
		}
		// The scene flies the flag of the state ruling the family's home that year.
		const planned = planShort(run, [family[0]], [{ file: 'a.wav', seconds: 4 }], { town: true });
		const ruler = run.history
			.find((h) => h.year === first.event.year)
			.polities.find((p) => p.cellIds.includes(first.member.cell));
		expect(shortSceneAt(run, planned, 1).town.color).toBe(polityColor(ruler.id));
		// The result card opens on who the family is by the end.
		expect(townBeats.at(-1).say).toMatch(new RegExp(`^In 2025, \\S+ ${surname} `));
		const legacy = shortScript({ ...run, families: undefined }, inputs, summary, { town: true });
		expect(legacy.some((b) => b.town?.familyEvent)).toBe(false);
	});
	it('can show an adopted communication technology without a world first', () => {
		const events = run.events.filter((e) => e.kind !== 'invention');
		const r = { ...run, events, families: [] };
		const draft = shortScript(r, inputs, summary, { town: true });
		const broadcast = draft.find((b) => b.town?.preset === 'broadcast');
		const event = events[broadcast.town.event];
		expect(event.kind).toBe('adoption');
		expect(['radio', 'television']).toContain(event.techId);
		expect(broadcast.say).toContain(event.title);
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
		expect(s.card.rows.map((r) => r.label)).toEqual([
			'Population',
			'Income per person',
			'Has electricity',
			'Can read (school)',
			'Life expectancy',
			'Wars',
			'Biggest city',
			'Religious mix'
		]);
		expect(beats.at(-1).say).toMatch(
			/Average income: \d+ thousand dollars a year\. Ours: \d+ thousand\./
		);
		expect(s.card.runs.theirs).toMatch(/Nigeria never formed$/);
	});
});
