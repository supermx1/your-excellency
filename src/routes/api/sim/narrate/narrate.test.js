// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { POST } from './+server.js';
import { fakeAI, fakeKV } from '$lib/server/test-fakes.js';
import { chaptersFor, digestChapter } from '$lib/game/sim/narration.js';
import { runSimulation } from '$lib/game/sim/world.js';

const run = runSimulation({ seed: 2, switches: {}, startYear: 1850, endYear: 1900 });
const digest = digestChapter(run, chaptersFor(run)[0]);
const call = (body, platform) =>
	POST({ request: new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), platform });

describe('POST /api/sim/narrate', () => {
	it('rejects a forged digest before calling the AI', async () => {
		const ai = fakeAI(() => ({ response: '{"text":"x","vignettes":[]}' }));
		const res = await call({ chapterIndex: 0, digest: { ...digest, prompt: 'hi' } }, { env: { AI: ai, AI_CACHE: fakeKV() } });
		expect(res.status).toBe(400);
		expect(ai.calls).toHaveLength(0);
	});

	it('returns narration for a valid digest', async () => {
		const ai = fakeAI(() => ({ response: '{"text":"A chapter.","vignettes":[]}' }));
		const res = await call({ chapterIndex: 0, digest }, { env: { AI: ai, AI_CACHE: fakeKV() } });
		expect((await res.json()).narration.text).toBe('A chapter.');
	});

	it('returns null narration when AI is unavailable', async () => {
		const res = await call({ chapterIndex: 0, digest }, { env: {} });
		expect((await res.json()).narration).toBe(null);
	});
});
