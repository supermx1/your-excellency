// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';
import { planExport, sceneAt, scenarioCard, captionChunks } from './export.js';
import { PRESETS } from './switches.js';
import { chaptersFor } from './narration.js';
import { shotsFor } from './camera.js';
import { INTRO, introCamera } from './intro.js';
import { endingRows } from './hud.js';
import { defaultData } from './data/index.js';

const run = runSimulation({ seed: 3, switches: defaultSwitches(), startYear: 1950, endYear: 2025 });
const chapters = chaptersFor(run);
const times = (plan, n = 400) => Array.from({ length: n + 1 }, (_, i) => (plan.duration * i) / n);

describe('render code fit for video', () => {
	it('render modules read no clock, randomness or animation frame', () => {
		const files = ['components/sim/diorama/Diorama.js', 'components/sim/diorama/globe.js', 'components/sim/diorama/geometry.js', 'components/sim/diorama/neighbours.js', 'game/sim/frame.js', 'game/sim/camera.js', 'game/sim/intro.js', 'game/sim/hud.js', 'game/sim/colors.js', 'game/sim/export.js'];
		for (const f of files) expect(readFileSync(`src/lib/${f}`, 'utf8'), f).not.toMatch(/Date\.now|performance\.now|Math\.random|requestAnimationFrame/);
	});

	it('Diorama accepts a fixed pixel ratio', () => {
		expect(readFileSync('src/lib/components/sim/diorama/Diorama.js', 'utf8')).toMatch(/pixelRatio/);
	});
});

describe('planExport', () => {
	it('opens on the scenario card, then the intro, then the run at from', () => {
		const plan = planExport(run, { from: 1970, to: 2000 });
		expect(plan.at(0).phase).toBe('title');
		expect(plan.at(6).phase).toBe('intro');
		expect(plan.at(6).play).toBe(0);
		expect(plan.at(6 + INTRO - 0.01).phase).toBe('intro');
		expect(Math.abs(plan.at(6 + INTRO + 0.01).year - 1970)).toBeLessThan(0.1);
	});

	it('the scenario card lasts as long as its voice', () => {
		const plan = planExport(run, { audio: { title: 11 } });
		expect(plan.cues[0]).toEqual({ chapter: 'title', start: 0, seconds: 11 });
		expect(plan.at(11.7).phase).toBe('title');
		expect(plan.at(11.81).phase).toBe('intro');
	});

	it('narration never runs into the next chapter', () => {
		const plan = planExport(run, { audio: { 0: 60, 1: 5 }, splits: [] });
		const [a, b] = plan.cues;
		expect(a.start + a.seconds + 0.8).toBeLessThanOrEqual(b.start + 1e-9);
	});

	it('a chapter with no narration keeps its own pace', () => {
		const c = chapters[1];
		const plan = planExport(run, { from: c.from, to: c.to, splits: [] });
		const own = plan.timeline.timeAt(c.to) - plan.timeline.timeAt(c.from);
		expect(plan.duration).toBeCloseTo(6 + INTRO + own + 4 + 9 + 10, 6);
	});

	it('a split year holds at the end of that year', () => {
		const y = 1960;
		const plan = planExport(run, { splits: [y] });
		const split = times(plan, 4000).map((t) => [t, plan.at(t)]).filter(([, a]) => a.phase === 'split');
		expect(split.at(-1)[0] - split[0][0]).toBeGreaterThan(3.9);
		for (const [, a] of split) {
			expect(a.year).toBe(y);
			expect(a.play).toBeCloseTo(plan.timeline.timeAt(y + 1), 9);
		}
	});

	it('never splits on the first year, before anything has happened', () => {
		const plan = planExport(run, { from: 1950, splits: [1950, 1960] });
		const years = new Set(times(plan, 2000).map((t) => plan.at(t)).filter((a) => a.phase === 'split').map((a) => a.year));
		expect([...years]).toEqual([1960]);
	});

	it('stays inside the chosen years', () => {
		const plan = planExport(run, { from: 1975, to: 1995 });
		for (const t of times(plan)) {
			const a = plan.at(t);
			if (a.phase === 'run') {
				expect(a.year).toBeGreaterThanOrEqual(1975 - 1e-9);
				expect(a.year).toBeLessThanOrEqual(1995 + 1e-9);
			}
		}
	});

	it('clamps and refuses', () => {
		const plan = planExport(run, { from: 1800, to: 2200 });
		expect([plan.from, plan.to]).toEqual([1950, 2025]);
		expect(() => planExport(run, { from: 2000, to: 1990 })).toThrow(RangeError);
	});

	it('ends on the results: table, the range across runs when known, what shaped it', () => {
		const plan = planExport(run, { from: 2000 });
		expect(plan.at(plan.duration).phase).toBe('shaped');
		expect(plan.at(plan.duration - 10.01).phase).toBe('ending');
		expect(plan.at(plan.duration - 19.01).phase).toBe('outro');
		const withRange = planExport(run, { from: 2000, summary: { endYear: 2025, runs: 50, outcomes: {} } });
		expect(withRange.at(withRange.duration - 10.01).phase).toBe('range');
	});
});

describe('sceneAt', () => {
	const plan = planExport(run, { splits: [1960] });
	const shots = shotsFor(run, plan.timeline);
	const scene = (t) => sceneAt(run, plan, shots, t, defaultData.national);

	it('opens on the scenario card, then the globe intro', () => {
		expect(scene(0).phase).toBe('title');
		expect(scene(6).camera).toEqual(introCamera(0));
	});

	it('shows the chapter and its narration as captions while the voice plays', () => {
		const texts = { 0: 'The states of 1850 carry on. Sokoto rules the north, and Ibadan grows in the south.' };
		const p = planExport(run, { audio: { 0: 6 }, texts, splits: [] });
		const start = p.cues.find((c) => c.chapter === 0).start;
		const s = sceneAt(run, p, shotsFor(run, p.timeline), start + 0.1, defaultData.national);
		expect(s.subtitle.kicker).toBe(`Chapter 1 · ${chapters[0].from}–${chapters[0].to}`);
		expect(s.subtitle.text).toBe('The states of 1850 carry on.');
		expect(sceneAt(run, p, shotsFor(run, p.timeline), start + 6.5, defaultData.national).subtitle.text).toBeNull();
	});

	it('a split shows both worlds at the same year', () => {
		const t = times(plan, 2000).find((x) => plan.at(x).phase === 'split');
		const s = scene(t);
		expect(s.real).not.toBeNull();
		expect(s.frame.year).toBe(s.real.year);
	});

	it('ends on the results', () => {
		const t = times(plan, 2000).find((x) => plan.at(x).phase === 'ending');
		expect(scene(t).ending).toEqual(endingRows(run, defaultData.national, null));
		const shaped = scene(plan.duration).shaped;
		expect(shaped.drivers.length).toBeGreaterThan(0);
		expect(shaped.income).toBeGreaterThan(0);
	});
});

describe('scenarioCard', () => {
	it('names the what-if and what changed from history', () => {
		const card = scenarioCard({ seed: 1, switches: { ...defaultSwitches(), ...PRESETS.neverColonized.switches }, startYear: 1850, endYear: 2025 });
		expect(card.label).toBe('Never colonized');
		expect(card.changes).toEqual([
			{ key: 'britishConquest', label: 'British conquest', value: 'off' },
			{ key: 'amalgamation', label: 'Amalgamation', value: 'off' }
		]);
		expect(card.spoken).toMatch(/^Never colonized\. Britain never conquers.*from 1850 to 2025\. Changed from history: British conquest, off; Amalgamation, off\.$/);
	});

	it('says when nothing was changed', () => {
		expect(scenarioCard({ seed: 1, switches: defaultSwitches(), startYear: 2018, endYear: 2025 }).spoken).toMatch(/Every switch is as in history/);
	});
});

describe('captionChunks', () => {
	const text = 'Over these years the population goes from 13.5 million to 16.3 million, and 1% can read at school. Sokoto holds the north.';
	const chunks = captionChunks(text, 10);
	it('keeps every word, a few at a time', () => {
		expect(chunks.map((c) => c.text).join(' ')).toBe(text);
		for (const c of chunks) expect(c.text.split(' ').length).toBeLessThanOrEqual(10);
	});
	it('fills the voice exactly, in order', () => {
		expect(chunks[0].start).toBe(0);
		expect(chunks.at(-1).end).toBeCloseTo(10, 9);
		for (let i = 1; i < chunks.length; i++) expect(chunks[i].start).toBeCloseTo(chunks[i - 1].end, 9);
	});
	it('never leaves one word alone on screen', () => {
		const lone = captionChunks(
			"1943: Colony and Protectorate of Nigeria sends the first people into space. That's 18 years before anyone in our world did it.",
			6
		);
		expect(lone.map((c) => c.text)).toContain('world did it.');
		for (const c of lone) expect(c.text.includes(' ')).toBe(true);
	});
	it('shows thousands as numerals', () => {
		expect(captionChunks('319 thousand people die.', 2)[0].text).toBe('319,000 people die.');
	});
});
