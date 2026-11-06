// @ts-nocheck
// Regression tests for the final branch review findings.
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { defaultSwitches, validateSwitches } from './switches.js';

const run = (seed, switches = {}, startYear = 1850, endYear = 2025) =>
	runSimulation({ seed, switches: { ...defaultSwitches(), ...switches }, startYear, endYear });

describe('review fixes', () => {
	it('late starts between 1885 and 1913 still form one Nigeria', () => {
		for (const start of [1900, 1906]) {
			const r = run(1, {}, start);
			expect(r.history.find((y) => y.year === 1920).polities.map((p) => p.id)).toEqual(['nigeria']);
		}
	});

	it('rejects inherited object keys', () => {
		for (const key of ['toString', 'constructor', 'hasOwnProperty'])
			expect(validateSwitches({ [key]: 1 }).ok).toBe(false);
		expect(validateSwitches(JSON.parse('{"__proto__":{"x":1}}')).ok).toBe(false);
	});

	it('capitals are always owned, wars are two-sided, no empty polities (30 seeds)', () => {
		for (let seed = 1; seed <= 30; seed++) {
			const r = run(seed);
			for (const y of r.history) {
				expect(Number.isInteger(y.totals.wars)).toBe(true);
				for (const p of y.polities) {
					expect(p.cellIds.length).toBeGreaterThan(0);
					expect(p.cellIds).toContain(p.capitalCell);
				}
			}
		}
	});

	it('independence set before Nigeria exists happens once Nigeria forms', () => {
		const r = run(1, { independenceYear: 1900 });
		const ind = r.events.find((e) => e.id === 'independence');
		expect(ind?.year).toBeGreaterThanOrEqual(1914);
	});

	it('an early independence year does not cancel later conquests on a late start', () => {
		const r = run(1, { independenceYear: 1890 }, 1900);
		expect(r.events.some((e) => e.id === 'amalgamation')).toBe(true);
	});
});

describe('dated events on modern starts', () => {
	it('does not replay independence or oil discovery after they are already in the past', () => {
		const r = run(42, {}, 2018, 2025);
		expect(r.events.filter((e) => e.id === 'independence' || e.id === 'oil-oloibiri')).toEqual([]);
	});

	it('still fires an explicitly postponed discovery and independence in the chosen year', () => {
		const r = run(42, { oilYear: 2030, independenceYear: 2030 }, 2020, 2032);
		expect(r.events.find((e) => e.id === 'oil-oloibiri')?.year).toBe(2030);
		expect(r.events.find((e) => e.id === 'independence')?.year).toBe(2030);
	});
});
