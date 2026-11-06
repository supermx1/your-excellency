// Read-aloud for the chapter card, using the browser's own speech (no service, no cost).

const RANK = [/^en[-_]NG/i, /^en[-_]GB/i, /^en[-_]US/i, /^en/i];

/**
 * The best English voice on this device: Nigerian English first, then British, American, any English;
 * within a language, a "Natural"/"Neural" voice first, then the system default (Macs list joke voices too).
 * @template {{ lang: string, name: string, default?: boolean }} V
 * @param {V[]} voices
 * @returns {V | null}
 */
export function pickVoice(voices) {
	for (const re of RANK) {
		const match = voices.filter((v) => re.test(v.lang));
		if (match.length)
			return match.find((v) => /natural|neural/i.test(v.name)) ?? match.find((v) => v.default) ?? match[0];
	}
	return null;
}

/**
 * Text → sentences, punctuation kept. A full stop between digits (13.5) is not a sentence end.
 * @param {string} text
 */
export function sentences(text) {
	return (text.match(/(?:\d\.\d|[^.!?])+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

// --- KittenTTS Nano: the same neural voice on every device ---------------------------------
// Model and voice ("Jasper", calm and clear) are self-hosted under static/kitten/ and run in
// tts.worker.js, so no request leaves this site. Apache-2.0, see static/kitten/NOTICE.
const KITTEN_BASE = '/kitten/';
const SPEED = 0.9; // about 120 words a minute: unhurried narration
const PAUSE = 0.35; // seconds of quiet between sentences
/** @type {Worker | null} */
let worker = null;
let nextId = 0;
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();

/** Asks the speech worker for one sentence of audio. */
function synthesize(/** @type {string} */ text) {
	if (!worker) {
		worker = new Worker(new URL('./tts.worker.js', import.meta.url), { type: 'module' });
		worker.onmessage = ({ data }) => {
			const job = pending.get(data.id);
			pending.delete(data.id);
			if (data.error) job?.reject(new Error(data.error));
			else job?.resolve(data);
		};
		worker.onerror = (e) => {
			for (const job of pending.values()) job.reject(new Error(e.message || 'speech worker failed'));
			pending.clear();
			worker?.terminate();
			worker = null;
		};
	}
	const id = nextId++;
	return /** @type {Promise<{ samples: Float32Array, sampleRate: number }>} */ (
		new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			worker?.postMessage({ id, text, base: KITTEN_BASE, speed: SPEED });
		})
	);
}

/** @param {AudioContext} ctx @param {{ samples: Float32Array, sampleRate: number }} audio @param {AbortSignal} signal */
function play(ctx, audio, signal) {
	return new Promise((resolve) => {
		const buffer = ctx.createBuffer(1, audio.samples.length, audio.sampleRate);
		buffer.copyToChannel(/** @type {Float32Array<ArrayBuffer>} */ (audio.samples), 0);
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		const stop = () => {
			try {
				source.stop();
			} catch {}
			resolve(undefined);
		};
		signal.addEventListener('abort', stop, { once: true });
		source.onended = () => {
			signal.removeEventListener('abort', stop);
			resolve(undefined);
		};
		source.start();
	});
}

/**
 * Reads `text` aloud with KittenTTS, synthesising the next sentence while the current one plays.
 * Rejects if the voice can't load or run, so the caller can fall back to the browser's voice.
 * @param {string} text @param {AudioContext} ctx @param {AbortSignal} signal
 * @param {() => void} [onReady] called once the voice has loaded
 */
export async function readWithKitten(text, ctx, signal, onReady) {
	const parts = sentences(text);
	// The first call also loads the runtime and voice (≈37 MB, once; the browser caches it) inside the worker.
	let next = parts.length ? synthesize(parts[0]) : null;
	for (let i = 0; i < parts.length && !signal.aborted; i++) {
		const audio = /** @type {{ samples: Float32Array, sampleRate: number }} */ (await next);
		if (i === 0) onReady?.();
		next = i + 1 < parts.length ? synthesize(parts[i + 1]) : null;
		if (signal.aborted) return;
		await play(ctx, audio, signal);
		if (i + 1 < parts.length && !signal.aborted) await new Promise((r) => setTimeout(r, PAUSE * 1000));
	}
}

/**
 * The browser's own voice, one utterance per sentence (Chrome's online voices go silent ~15 s
 * into a long one). Used when KittenTTS can't run.
 * @param {string} text @param {AbortSignal} signal
 */
export function readWithBrowser(text, signal) {
	if (!('speechSynthesis' in window)) return;
	const voice = pickVoice(speechSynthesis.getVoices());
	speechSynthesis.cancel();
	for (const s of sentences(text)) {
		const say = new SpeechSynthesisUtterance(s);
		if (voice) {
			say.voice = voice;
			say.lang = voice.lang;
		}
		say.rate = 0.95;
		speechSynthesis.speak(say);
	}
	signal.addEventListener('abort', () => speechSynthesis.cancel(), { once: true });
}
