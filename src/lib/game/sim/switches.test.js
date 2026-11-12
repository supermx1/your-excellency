// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { SWITCHES, PRESETS, defaultSwitches, validateSwitches } from './switches.js';
import { runSimulation } from './world.js';
import { summarize } from './worker.js';

describe('switches and presets', () => {
	it('rejects unknown keys', () => expect(validateSwitches({ foo: 1 }).ok).toBe(false));

	it('rejects out-of-range values', () => {
		expect(validateSwitches({ learning: 9 }).ok).toBe(false);
		expect(validateSwitches({ trust: 'maybe' }).ok).toBe(false);
		expect(validateSwitches({ civilWar: 'yes' }).ok).toBe(false);
		expect(validateSwitches({ power24hFromYear: 1700 }).ok).toBe(false);
		expect(validateSwitches(null).ok).toBe(false);
	});

	it('fills defaults and accepts every preset', () => {
		expect(validateSwitches({}).switches).toEqual(defaultSwitches());
		for (const p of Object.values(PRESETS)) expect(validateSwitches(p.switches).ok).toBe(true);
	});

	it('never-colonized preset from 1850 never has British rule', () => {
		const p = PRESETS.neverColonized;
		const run = runSimulation({ seed: 1, switches: validateSwitches(p.switches).switches, startYear: p.startYear, endYear: 2025 });
		expect(run.events.some((e) => e.id === 'lagos-annexed' || e.id === 'amalgamation')).toBe(false);
		for (const y of run.history) expect(y.polities.some((x) => x.id === 'british' || x.id === 'nigeria')).toBe(false);
	});

	it('start year 2020 running to 2100 uses the modern borders', () => {
		const run = runSimulation({ seed: 1, switches: defaultSwitches(), startYear: 2020, endYear: 2100 });
		expect(run.history[0].polities.map((p) => p.id)).toEqual(['nigeria']);
		expect(run.history.at(-1).year).toBe(2100);
		expect(run.history[0].totals.pop).toBeGreaterThan(150e6);
	});

	it('switch keys are exactly the agreed list (none targets a faith or group)', () => {
		expect(Object.keys(SWITCHES).sort()).toEqual(
			[
				'britishConquest', 'indirectRule', 'capitalToAbuja', 'amalgamation', 'independenceYear', 'civilWar', 'coups', 'oilDiscovery', 'oilYear',
				'learning', 'health', 'trust', 'oilInGround', 'malaria', 'drought', 'power24hFromYear',
				'freeSchoolingFromYear', 'corruption', 'religiousTolerance', 'christianMissions', 'stateReligion', 'sharia',
				// Both apply to everyone alike: one shared faith for all, or soldiers of any background.
				'militaryHandsBack', 'onePeople'
			].sort()
		);
	});

	it('military-never-leaves keeps soldiers in power from 1999', () => {
		const p = PRESETS.militaryStays;
		for (const seed of [1, 2, 3]) {
			const run = runSimulation({ seed, switches: validateSwitches(p.switches).switches, startYear: p.startYear, endYear: 2030 });
			expect(run.events.some((e) => /Civilian rule returns/.test(e.title))).toBe(false);
		}
		const history = runSimulation({ seed: 1, switches: defaultSwitches(), startYear: 1999, endYear: 2060 });
		expect(history.events.some((e) => /Civilian rule returns/.test(e.title))).toBe(true);
	});

	it('one people: one faith everywhere, no tension from difference', () => {
		const run = runSimulation({ seed: 1, switches: validateSwitches(PRESETS.onePeople.switches).switches, startYear: 1850, endYear: 1950 });
		const end = run.history.at(-1);
		const faiths = new Set(end.cells.map((c) => Object.keys(c.religion).find((f) => c.religion[f] === 1)));
		expect(faiths).toEqual(new Set(['traditional'])); // most people held traditional faiths in 1850
		for (const c of end.cells) expect(c.tension).toBe(0);
	});

	it('summarize counts outcomes across runs', () => {
		const runs = [1, 2, 3].map((seed) => runSimulation({ seed, switches: defaultSwitches(), startYear: 1850, endYear: 2025 }));
		const s = summarize(runs);
		expect(s.runs).toBe(3);
		expect(s.pop2025.min).toBeLessThanOrEqual(s.pop2025.median);
		expect(s.nigeriaFormed).toBeGreaterThanOrEqual(0);
	});
});
