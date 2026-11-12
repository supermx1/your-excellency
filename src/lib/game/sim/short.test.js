import { polityColor } from './colors.js';
// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches, PRESETS } from './switches.js';
import { shortScript, planShort, shortSceneAt, shortLabel } from './short.js';
import { defaultData } from './data/index.js';

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
	it('200 IQ: the biggest state that drives Britain off gets its own scene', () => {
		const genius = {
			...inputs,
			seed: 17,
			switches: { ...defaultSwitches(), ...PRESETS.genius.switches }
		};
		const r = runSimulation(genius);
		const shots = shortScript(r, genius, summary, { town: true }).filter((b) => b.town);
		const held = shots.find((b) => b.town.preset === 'repelled');
		expect(held.say).toMatch(
			/^\d{4}: .+ drives? off a British attack\..* In all, \d+ British attacks fail\.$/
		);
		const shot = shortSceneAt(
			r,
			planShort(r, [held], [{ file: 'a.wav', seconds: 4 }], { town: true }),
			2
		).town;
		expect(shot.rivals).toEqual([shot.color, polityColor('british')]);
		expect(shot.winner).toBe(0);
	});
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
			'Britain never conquers the region. I gave every Nigerian a 200 IQ: everyone learns and invents three times faster. I ran Nigeria from 1850 to 2025.'
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
	it('shows up to four milestones, each against when it reached our Nigeria, spread over the run', () => {
		expect(beats.some((beat) => beat.town)).toBe(false);
		const cut = townBeats.filter((b) => b.town);
		expect(cut.length).toBeGreaterThan(1);
		expect(cut.length).toBeLessThanOrEqual(4);
		expect(new Set(cut.map((b) => b.town.preset)).size).toBe(cut.length);
		for (let i = 1; i < cut.length; i++)
			expect(cut[i].to - cut[i - 1].to).toBeGreaterThanOrEqual(15);
		// The deadliest war gets a battle: both sides' colours, and who won.
		const battle = cut.find((b) => b.town.preset === 'battle');
		const war = run.events[battle.town.event];
		expect(war.kind).toBe('war');
		expect(battle.say).toMatch(
			new RegExp(
				`^${war.year}: .+\\. [\\d.]+ (million|thousand) people die before peace in \\d{4}\\.$`
			)
		);
		const shot = shortSceneAt(
			run,
			planShort(run, [battle], [{ file: 'b.wav', seconds: 4 }], { town: true }),
			1
		).town;
		expect(shot.rivals).toHaveLength(2);
		expect([-1, 0, 1]).toContain(shot.winner);
		for (const b of cut.filter((x) => x !== battle)) {
			const e = run.events[b.town.event];
			expect(['adoption', 'invention']).toContain(e.kind);
			const ours = defaultData.tech.find((t) => t.id === e.techId).nigeriaYear;
			const n = Math.abs(ours - e.year);
			expect(b.say).toBe(
				`${e.year}: ${e.title}.${
					ours === e.year
						? ' The same year as in our Nigeria.'
						: ` That's ${n} year${n === 1 ? '' : 's'} ${ours > e.year ? 'earlier' : 'later'} than in our Nigeria.`
				}`
			);
		}
		expect(townBeats.some((b) => b.town?.familyEvent)).toBe(false); // no family thread
		// The scene flies the flag of the state the milestone reached.
		const planned = planShort(run, [cut[0]], [{ file: 'a.wav', seconds: 4 }], { town: true });
		const e = run.events[cut[0].town.event];
		expect(shortSceneAt(run, planned, 1).town).toMatchObject({
			year: e.year,
			color: polityColor(e.polityIds[0])
		});
	});
	it('puts the run’s world firsts first', () => {
		const genius = { ...inputs, switches: { ...inputs.switches, learning: 3 }, endYear: 2100 };
		const r = runSimulation(genius);
		const cut = shortScript(r, genius, summary, { town: true }).filter((b) => b.town);
		expect(cut.length).toBeLessThanOrEqual(4);
		for (let i = 1; i < cut.length; i++) expect(cut[i].to).toBeGreaterThan(cut[i - 1].to);
		const firsts = cut.filter((b) => !b.say.includes('our Nigeria') && b.town.preset !== 'battle');
		expect(firsts.length).toBeGreaterThan(0);
		for (const b of firsts) {
			const e = r.events[b.town.event];
			expect(e).toMatchObject({ kind: 'invention', worldFirst: true });
			expect(b.say).toMatch(
				/years before anyone in our world did it\.|Nobody in our world has done that yet\./
			);
		}
		expect(
			firsts.some((b) =>
				['crewed-spaceflight', 'moon-base', 'mars-landing'].includes(r.events[b.town.event].techId)
			)
		).toBe(true);
		// Each shot carries what the page needs: the state's colour and what it had built by then.
		const all = shortScript(r, genius, summary, { town: true });
		const p = planShort(
			r,
			all,
			all.map((_, i) => ({ file: `audio/${i}.wav`, seconds: 4 })),
			{ town: true }
		);
		for (const shot of p.segments.filter((sg) => sg.town).map((sg) => sg.town)) {
			expect(shot.color).toMatch(/^#[0-9a-f]{6}$/);
			if (shot.tech) expect(shot.techs).toContain(shot.tech);
		}
		expect(shortScript(r, genius, summary).some((b) => b.town)).toBe(false);
	});
	it('shows the power switch it is about: the lights coming on, and power in the result', () => {
		const lit = {
			seed: 5,
			switches: { ...defaultSwitches(), power24hFromYear: 1960 },
			startYear: 1950,
			endYear: 2025
		};
		const litRun = runSimulation(lit);
		const script = shortScript(litRun, lit, null, { town: true });
		const scene = script.find((b) => b.town?.preset === 'home-power');
		expect(scene.say).toMatch(/^1960: The lights come on/);
		expect(scene.to).toBe(1960);
		expect(script.at(-1).say).toMatch(/electricity, \d+ hours a day\. Ours: \d+% of homes\./);
		expect(script.some((b) => /\(\d{4}\)/.test(b.say))).toBe(false); // no "Military coup (1983)"
		// The scene has no event behind it, and still plans (it would throw otherwise).
		expect(() =>
			planShort(
				litRun,
				script,
				script.map((_, i) => ({ file: `a${i}.wav`, seconds: 4 })),
				{ town: true }
			)
		).not.toThrow();
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
			'Power made',
			'Exports a year',
			'Can read (school)',
			'Life expectancy',
			'Wars',
			'Biggest city',
			'Religious mix'
		]);
		expect(beats.at(-1).say).toMatch(
			/Average income: [\d,]+00 dollars a year, (about as rich as|richer than|poorer than) [A-Z].* today\. Ours: [\d,]+00\./
		);
		expect(beats.at(-1).say).toMatch(
			/It makes \d+ terawatt-hours of electricity a year and sells [\d.]+ (billion|trillion) dollars of goods abroad, mostly [a-z ]+\. Ours: \d+ terawatt-hours, and 48 billion dollars in 2022, mostly oil\./
		);
		expect(s.card.runs.theirs).toMatch(/Nigeria never formed$/);
	});
});
