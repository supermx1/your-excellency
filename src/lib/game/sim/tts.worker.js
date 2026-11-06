// @ts-nocheck
// sanoTTS in a Web Worker, so turning text into speech (~1 s of work per sentence on a laptop,
// more on phones) never freezes the 3D map. Messages: { id, text, base, voice } → { id, samples, sampleRate } | { id, error }.
import { SanoTTS } from 'sanotts-web';

// sanotts-web loads its Emscripten glue by adding <script> tags. A worker has no document, so this
// stand-in fetches the same files and runs them in global scope, which is all a <script> tag would do.
// ponytail: only ever runs our own self-hosted /sanotts/ files.
globalThis.document ??= {
	currentScript: undefined,
	createElement: () => ({}),
	head: {
		appendChild(el) {
			fetch(el.src)
				.then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status} for ${el.src}`))))
				.then((code) => {
					(0, eval)(`${code}\n//# sourceURL=${el.src}`);
					el.onload?.();
				})
				.catch((err) => el.onerror?.(err));
		}
	}
};

let ready = null;

self.onmessage = async ({ data: { id, text, base, voice } }) => {
	try {
		ready ??= SanoTTS.load({ assetBase: base }).then(async (tts) => (await tts.loadVoice(voice, { voiceBase: base }), tts));
		const tts = await ready;
		const r = await tts.synthesize(text, { voice, voiceBase: base });
		// Copy out of the wasm heap before transferring, so the heap itself is never detached.
		const samples = r.samples.slice();
		self.postMessage({ id, samples, sampleRate: r.sampleRate }, [samples.buffer]);
	} catch (err) {
		ready = null;
		self.postMessage({ id, error: String(err?.message ?? err) });
	}
};
