// @ts-nocheck
// The Timeline's AI narration: owner edits → cache → daily budget → Workers AI → validate → cache.
// Any failure returns null and the browser shows the built-in narration.
import { getRun } from './sim-runs.js';

export const SIM_DAILY_NEURONS = 6000; // of the account's 10,000 free; the rest is left for The Campaign
const MODEL = '@cf/google/gemma-4-26b-a4b-it';
const FALLBACK_MODEL = '@cf/meta/llama-3.2-3b-instruct';
const RATES = { [MODEL]: [9091, 27273], [FALLBACK_MODEL]: [4625, 30475] }; // neurons per million tokens [in, out]
const MAX_TOKENS = 500;
const TIMEOUT_MS = 6000;

const SYSTEM =
	'You narrate one chapter of a simulated alternate history of Nigeria for a YouTube video. Write in plain, vivid English for a general audience. Describe only what the data says happened in this run; never invent wars, inventions or deaths that are not listed, and never present it as a prediction. Compare with real history only using the "ours" lines. Families are fictional; write one short vignette per family listed, in the third person, present tense. No real living people. Reply with JSON only.';

const SCHEMA = {
	type: 'object',
	required: ['text', 'vignettes'],
	properties: {
		text: { type: 'string', maxLength: 900 },
		vignettes: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 300 } }
	}
};

const today = () => new Date().toISOString().slice(0, 10);

async function sha256(text) {
	const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Parses and checks model output. Returns { text, vignettes } or null. */
export function parseNarration(raw) {
	let value = raw;
	if (typeof value === 'string') {
		const stripped = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
		try {
			value = JSON.parse(stripped);
		} catch {
			return null;
		}
	}
	if (!value || typeof value.text !== 'string' || !value.text.trim() || value.text.length > 900) return null;
	const vignettes = Array.isArray(value.vignettes) ? value.vignettes : [];
	if (vignettes.length > 4 || vignettes.some((v) => typeof v !== 'string' || v.length > 300)) return null;
	return { text: value.text.trim(), vignettes };
}

const withTimeout = (promise) =>
	Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))]);

function neurons(model, usage, promptChars) {
	const [rin, rout] = RATES[model];
	const tin = usage?.prompt_tokens ?? promptChars / 4;
	const tout = usage?.completion_tokens ?? MAX_TOKENS;
	return Math.ceil((tin / 1e6) * rin + (tout / 1e6) * rout);
}

async function callModel(ai, model, prompt) {
	const out = await withTimeout(
		ai.run(model, {
			messages: [
				{ role: 'system', content: SYSTEM },
				{ role: 'user', content: prompt }
			],
			max_tokens: MAX_TOKENS,
			response_format: { type: 'json_schema', json_schema: SCHEMA }
		})
	);
	return { raw: out?.response ?? out, usage: out?.usage };
}

/**
 * @param {any} platform
 * @param {{ runId?: string, chapterIndex: number, digest: object }} req digest already validated
 * @returns {Promise<{ text: string, vignettes: string[] } | null>}
 */
export async function narrate(platform, { runId, chapterIndex, digest }) {
	const env = platform?.env;
	if (!env) return null;

	if (runId && env.DB) {
		const edited = (await getRun(env.DB, runId).catch(() => null))?.narration?.[chapterIndex];
		if (edited) return edited;
	}

	const kv = env.AI_CACHE;
	const key = `sim-narr:${runId ?? (await sha256(JSON.stringify(digest)))}:${chapterIndex}`;
	const cached = await kv?.get(key);
	if (cached) return JSON.parse(cached);

	if (!env.AI) return null;
	const budgetKey = `sim-neurons:${today()}`;
	const spent = Number((await kv?.get(budgetKey)) ?? 0);
	if (spent >= SIM_DAILY_NEURONS) return null;

	const prompt = `Chapter data (JSON):\n${JSON.stringify(digest)}`;
	let result = null;
	let cost = 0;
	for (const model of [MODEL, FALLBACK_MODEL]) {
		try {
			const { raw, usage } = await callModel(env.AI, model, prompt);
			cost += neurons(model, usage, prompt.length);
			result = parseNarration(raw);
			break; // a bad answer is not retried on the other model; only errors are
		} catch (err) {
			console.warn(`sim-narrate: ${model} failed —`, err?.message ?? err);
			if (err?.message === 'timeout') {
				cost += neurons(model, null, prompt.length); // the model may still have run; count it
				break;
			}
		}
	}
	if (cost) await kv?.put(budgetKey, String(spent + cost), { expirationTtl: 60 * 60 * 26 });
	if (result) await kv?.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 90 });
	return result;
}
