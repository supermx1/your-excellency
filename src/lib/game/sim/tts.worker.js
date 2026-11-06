// @ts-nocheck
// KittenTTS Nano (int8, Apache-2.0) in a Web Worker, so speech never freezes the 3D map.
// Model and voice are self-hosted under static/kitten/; the runtime ships with the app. No request leaves the site.
// Messages: { id, text, base, speed } → { id, samples, sampleRate } | { id, error }.
import * as ort from 'onnxruntime-web/wasm';
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import { phonemize } from 'phonemizer';
import { chunks, polish, speakable, tokenIds } from './kitten.js';

ort.env.wasm.wasmPaths = { wasm, mjs };

const RATE = 24000;
const STYLE = 256; // voice file: 400 rows × 256 floats, one row per input length
const SPEED_PRIOR = 0.8; // KittenTTS's own setting for this voice
const TAIL = 5000; // the model ends every clip with noise; KittenTTS trims it the same way

let ready = null;

async function load(base) {
	const get = (f) => fetch(base + f).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status} for ${f}`))));
	const [model, voice] = await Promise.all([get('kitten_tts_nano_v0_8.onnx'), get('jasper.bin')]);
	const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
	return { session, voice: new Float32Array(voice) };
}

async function toPhonemes(text) {
	let out = '';
	for (const part of chunks(text)) {
		if (/[\p{L}\p{N}]/u.test(part)) out += ((await phonemize(part, 'en-us')) ?? []).join(' ').replace(/_/g, '').replace(/\n/g, ' ');
		else out += part;
	}
	return out.trim();
}

self.onmessage = async ({ data: { id, text, base, speed } }) => {
	try {
		const { session, voice } = await (ready ??= load(base));
		const ids = tokenIds(await toPhonemes(speakable(text)));
		const row = Math.min(ids.length, voice.length / STYLE - 1);
		const result = await session.run({
			input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
			style: new ort.Tensor('float32', voice.slice(row * STYLE, (row + 1) * STYLE), [1, STYLE]),
			speed: new ort.Tensor('float32', new Float32Array([speed * SPEED_PRIOR]), [1])
		});
		const raw = result[session.outputNames[0]].data;
		const samples = polish(raw.slice(0, Math.max(0, raw.length - TAIL)), RATE);
		self.postMessage({ id, samples, sampleRate: RATE }, [samples.buffer]);
	} catch (err) {
		ready = null;
		self.postMessage({ id, error: String(err?.message ?? err) });
	}
};
