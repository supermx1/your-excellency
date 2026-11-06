// Release checks: every preset and the real-history baseline run all the way to 2100 without
// impossible numbers, for a few seeds. Cheap, and catches the long-run blow-ups players would see first.
import { describe, expect, it } from 'vitest';
import { runSimulation } from './world.js';
import { PRESETS, defaultSwitches } from './switches.js';

const SCENARIOS = { history: { startYear: 1850, switches: {} }, ...PRESETS };
const SHARES = ['urban', 'litAny', 'litSchool', 'electricityAccess', 'powerService', 'foodStress'];

describe.each(Object.entries(SCENARIOS))('%s to 2100', (name, preset) => {
	it.each(['a', 'b', 'c'])('seed %s stays possible', (seed) => {
		const run = runSimulation({ seed, startYear: preset.startYear, endYear: 2100, switches: { ...defaultSwitches(), ...preset.switches } });
		expect(run.history.at(-1).year).toBe(2100);
		for (const snap of run.history) {
			const ids = snap.polities.map((p) => p.id);
			expect(new Set(ids).size, `${snap.year} duplicate polity`).toBe(ids.length);
			for (const c of snap.cells) {
				const where = `${name}/${seed} ${snap.year} ${c.id}`;
				expect(c.pop, where).toBeGreaterThan(0);
				expect(Number.isFinite(c.incomePc) && c.incomePc > 0, `${where} income`).toBe(true);
				expect(c.lifeExp, `${where} lifeExp`).toBeGreaterThanOrEqual(15);
				expect(c.lifeExp, `${where} lifeExp`).toBeLessThanOrEqual(100);
				for (const k of SHARES) expect(c[k] >= 0 && c[k] <= 1, `${where} ${k}=${c[k]}`).toBe(true);
				expect(ids, `${where} owner`).toContain(c.polityId);
			}
		}
		const last = run.history.at(-1).totals;
		expect(last.pop).toBeGreaterThan(1e6);
		expect(last.pop).toBeLessThan(1.2e9);
		for (const e of run.events) expect(e.year).toBeLessThanOrEqual(2100);
	});
});
