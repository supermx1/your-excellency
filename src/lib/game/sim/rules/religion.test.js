// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../world.js';

const ISLAM = { islam: 0.9, christian: 0, traditional: 0.1 };
const CHRISTIAN = { islam: 0, christian: 0.9, traditional: 0.1 };
const TRAD = { islam: 0, christian: 0, traditional: 1 };

function data(religions, polityFaith = [null, null]) {
	const ids = ['a', 'b', 'c', 'd'];
	return {
		cells: ids.map((id, i) => ({
			id,
			neighbours: ids.filter((_, j) => Math.abs(i - j) === 1),
			area: 1,
			coastal: false,
			pop: 1e6,
			religion: religions[i]
		})),
		polities: [
			{ id: 'p1', name: 'P1', capitalCell: 'a', cellIds: ['a', 'b'], stateReligion: polityFaith[0] },
			{ id: 'p2', name: 'P2', capitalCell: 'd', cellIds: ['c', 'd'], stateReligion: polityFaith[1] }
		],
		events: { flags: [], groups: {}, events: [{ id: 'm', year: 1850, kind: 'history', switch: 'christianMissions', title: 'missions', effects: { flags: { missionsActive: true } } }] },
		tech: [],
		startFlags: { missionsActive: true }
	};
}

const run = (d, switches = {}) =>
	runSimulation({ seed: 3, switches, startYear: 1850, endYear: 1950 }, d);
const series = (r, key) => r.history.map((s) => s.cells.map((c) => c[key]));
const meanTension = (r) => r.history.reduce((s, y) => s + y.cells.reduce((t, c) => t + c.tension, 0), 0);

describe('religion', () => {
	it('shares always sum to 1', () => {
		const r = run(data([ISLAM, ISLAM, CHRISTIAN, TRAD]));
		for (const y of r.history)
			for (const c of y.cells) expect(c.religion.islam + c.religion.christian + c.religion.traditional).toBeCloseTo(1, 3);
	});

	it('missions off keeps christian share at 0 where it starts at 0', () => {
		const r = run(data([ISLAM, TRAD, TRAD, TRAD]), { christianMissions: false });
		for (const y of r.history) for (const c of y.cells) expect(c.religion.christian).toBe(0);
	});

	it('higher tolerance lowers average tension', () => {
		const d = data([ISLAM, ISLAM, CHRISTIAN, CHRISTIAN]);
		expect(meanTension(run(d, { religiousTolerance: 'high' }))).toBeLessThan(
			meanTension(run(d, { religiousTolerance: 'low' }))
		);
	});

	it('mirror: swapping which faith is where gives the same tension and literacy', () => {
		const one = run(data([ISLAM, ISLAM, CHRISTIAN, CHRISTIAN], ['islam', 'christian']));
		const two = run(data([CHRISTIAN, CHRISTIAN, ISLAM, ISLAM], ['christian', 'islam']));
		expect(series(two, 'tension')).toEqual(series(one, 'tension'));
		expect(series(two, 'litAny')).toEqual(series(one, 'litAny'));
		expect(series(two, 'pop')).toEqual(series(one, 'pop'));
	});

	it('state religion raises that faith in the polity over time', () => {
		const r = run(data([TRAD, TRAD, TRAD, TRAD], ['islam', null]));
		const last = r.history.at(-1).cells;
		expect(last[0].religion.islam).toBeGreaterThan(last[3].religion.islam);
		expect(last[0].religion.islam).toBeGreaterThan(0);
	});
});
