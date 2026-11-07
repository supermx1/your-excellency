// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';
import { planExport, sceneAt } from './export.js';
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
	it('intro maps straight through, then the run starts at from', () => {
		const plan = planExport(run, { from: 1970, to: 2000 });
		expect(plan.at(0).play).toBe(0);
		expect(plan.at(INTRO - 0.01).phase).toBe('intro');
		expect(Math.abs(plan.at(INTRO + 0.01).year - 1970)).toBeLessThan(0.1);
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
		expect(plan.duration).toBeCloseTo(INTRO + own + 4 + 8, 6);
	});

	it('a split year holds at the end of that year', () => {
		const y = 1960;
		const plan = planExport(run, { splits: [y] });
		const split = times(plan, 2000).map((t) => [t, plan.at(t)]).filter(([, a]) => a.phase === 'split');
		expect(split.at(-1)[0] - split[0][0]).toBeGreaterThan(3.9);
		for (const [, a] of split) {
			expect(a.year).toBe(y);
			expect(a.play).toBeCloseTo(plan.timeline.timeAt(y + 1), 9);
		}
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

	it('ends on the ending card', () => {
		const plan = planExport(run, { from: 2000, audio: { [chapters.at(-1).index]: 3 } });
		expect(plan.at(plan.duration).phase).toBe('ending');
		expect(plan.at(plan.duration - 8.01).phase).toBe('outro');
	});
});

describe('sceneAt', () => {
	const plan = planExport(run, { splits: [1960] });
	const shots = shotsFor(run, plan.timeline);
	const scene = (t) => sceneAt(run, plan, shots, t, defaultData.national);

	it('opens on the globe intro', () => {
		expect(scene(0).camera).toEqual(introCamera(0));
	});

	it('a split shows both worlds at the same year', () => {
		const t = times(plan, 2000).find((x) => plan.at(x).phase === 'split');
		const s = scene(t);
		expect(s.real).not.toBeNull();
		expect(s.frame.year).toBe(s.real.year);
	});

	it('ends on the ending table', () => {
		expect(scene(plan.duration).ending).toEqual(endingRows(run, defaultData.national, null));
	});
});
