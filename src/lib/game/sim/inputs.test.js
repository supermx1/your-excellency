// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { validateInputs, encodeInputs, decodeInputs } from './inputs.js';
import { handleMessage } from './worker.js';
import { runSimulation } from './world.js';
import { defaultSwitches, PRESETS } from './switches.js';

const good = { seed: 7, switches: {}, startYear: 1850, endYear: 2025 };

describe('run inputs', () => {
	it('rejects years out of range and end before start', () => {
		expect(validateInputs({ ...good, startYear: 1849 }).ok).toBe(false);
		expect(validateInputs({ ...good, startYear: 2026 }).ok).toBe(false);
		expect(validateInputs({ ...good, endYear: 1850 }).ok).toBe(false);
		expect(validateInputs({ ...good, endYear: 2101 }).ok).toBe(false);
	});

	it('coerces a numeric seed string and rejects others', () => {
		expect(validateInputs({ ...good, seed: '42' }).inputs.seed).toBe(42);
		expect(validateInputs({ ...good, seed: 'abc' }).ok).toBe(false);
	});

	it('fills default switches', () => {
		expect(validateInputs(good).inputs.switches).toEqual(defaultSwitches());
	});

	it('encode and decode round-trip', () => {
		const { inputs } = validateInputs({ ...good, switches: { learning: 3 } });
		expect(decodeInputs(encodeInputs(inputs))).toEqual({ ok: true, inputs });
	});

	it('decoding garbage fails cleanly', () => {
		expect(decodeInputs('%%%').ok).toBe(false);
		expect(decodeInputs('').ok).toBe(false);
		expect(decodeInputs(null).ok).toBe(false);
	});
});

describe('engine fixes', () => {
	it('the worker posts an error when the engine throws', () => {
		const posts = [];
		handleMessage({ inputs: { seed: 1, switches: {}, startYear: 1700, endYear: 1710 } }, (m) => posts.push(m));
		expect(posts.at(-1).type).toBe('error');
	});

	it('each scheduled coup is logged once', () => {
		const r = runSimulation({ seed: 1, switches: defaultSwitches(), startYear: 1850, endYear: 2025 });
		const nigeriaCoups = r.events.filter((e) => e.kind === 'coup' && e.polityIds?.includes('nigeria'));
		const scheduled = r.events.filter((e) => e.id?.startsWith('coup-'));
		for (const s of scheduled) expect(nigeriaCoups.some((c) => c.year === s.year)).toBe(false);
	});

	it('no random coups in British-ruled territory', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const r = runSimulation({ seed, switches: defaultSwitches(), startYear: 1850, endYear: 1960 });
			expect(r.events.some((e) => e.kind === 'coup' && e.title.includes('British'))).toBe(false);
		}
	});

	it('the 200 IQ preset starts in 1850', () => expect(PRESETS.genius.startYear).toBe(1850));
});
