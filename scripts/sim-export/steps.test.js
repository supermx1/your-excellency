// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { parseArgs, preflight, loadRun, narrationFor } from './steps.js';

const ID = 'Ab12Cd34Ef';

describe('parseArgs', () => {
	it('defaults to Michael at 1080p, no render', () => {
		expect(parseArgs([ID])).toMatchObject({ runId: ID, voice: 'am_michael', width: 1920, height: 1080, render: false });
	});
	it('reads 4K, years and splits', () => {
		expect(parseArgs([ID, '--4k', '--from', '1960', '--to', '2025', '--splits', '1914,1967', '--render'])).toMatchObject({
			width: 3840,
			height: 2160,
			from: 1960,
			to: 2025,
			splits: [1914, 1967],
			render: true
		});
	});
	it('reads the Short options', () => {
		expect(parseArgs([ID, '--fresh-script', '--voice-ref', 'voice/me.wav'])).toMatchObject({ freshScript: true, voiceRef: 'voice/me.wav' });
	});
	it('refuses a bad id or option', () => {
		expect(() => parseArgs(['nope'])).toThrow(/run id/);
		expect(() => parseArgs([ID, '--fast'])).toThrow(/Unknown option/);
	});
});

describe('preflight', () => {
	it('names the install line when Kokoro is missing', () => {
		expect(() => preflight(() => { throw new Error('no'); }, 'python')).toThrow(/pip install kokoro-onnx soundfile/);
	});
	it('passes when Kokoro imports', () => {
		expect(() => preflight(() => {}, 'python')).not.toThrow();
	});
});

describe('loadRun', () => {
	const deps = { engineVersion: 17, runSimulation: (i) => ({ rerun: i }), unpackOutput: async (o) => ({ unpacked: o }) };
	it('uses the recording first', async () => {
		expect(await loadRun({ output: 'x', engine_version: 3, inputs: '{}' }, deps)).toEqual({ unpacked: 'x' });
	});
	it('re-runs on the same engine', async () => {
		expect(await loadRun({ output: null, engine_version: 17, inputs: '{"seed":1}' }, deps)).toEqual({ rerun: { seed: 1 } });
	});
	it('stops on an older engine without a recording', async () => {
		await expect(loadRun({ output: null, engine_version: 12, inputs: '{}' }, deps)).rejects.toThrow(/feature/);
	});
});

describe('narrationFor', () => {
	const base = { runId: ID, site: 'https://x', fallbackNarration: () => ({ text: 'built-in' }) };
	const reply = (status, body) => async () => ({ ok: status === 200, json: async () => body });
	it('uses the site text', async () => {
		expect(await narrationFor({ index: 0 }, {}, { ...base, fetch: reply(200, { narration: { text: 'ai' } }) })).toEqual({ text: 'ai', ai: true });
	});
	it('asks again when the AI times out', async () => {
		let calls = 0;
		const fetch = async () => ({ ok: true, json: async () => ({ narration: ++calls < 3 ? null : { text: 'ai' } }) });
		expect(await narrationFor({ index: 0 }, {}, { ...base, fetch })).toEqual({ text: 'ai', ai: true });
		expect(calls).toBe(3);
	});
	it('falls back on null, an error status or no network', async () => {
		const built = { text: 'built-in', ai: false };
		expect(await narrationFor({ index: 0 }, {}, { ...base, fetch: reply(200, { narration: null }) })).toEqual(built);
		expect(await narrationFor({ index: 0 }, {}, { ...base, fetch: reply(500, {}) })).toEqual(built);
		expect(await narrationFor({ index: 0 }, {}, { ...base, fetch: async () => { throw new Error('offline'); } })).toEqual(built);
	});
});
