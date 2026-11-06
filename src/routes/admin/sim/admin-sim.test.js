// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { actions } from './+page.server.js';
import { fakeD1, fakeKV } from '$lib/server/test-fakes.js';
import { saveRun, setFeatured, getRun } from '$lib/server/sim-runs.js';

const form = (fields) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(fields)) f.set(k, v);
	return new Request('http://x', { method: 'POST', body: f });
};

describe('/admin/sim actions', () => {
	it('saves edited narration for a chapter and clears its cache', async () => {
		const db = fakeD1();
		const kv = fakeKV();
		const { id } = await saveRun(db, { inputs: { seed: 1, switches: {}, startYear: 2015, endYear: 2025 }, engineVersion: 1 });
		await setFeatured(db, id, { featured: true, title: 'T', output: 'x' });
		await kv.put(`sim-narr:${id}:0`, '{"text":"old","vignettes":[]}');
		const platform = { env: { DB: db, AI_CACHE: kv, ADMIN_PASSWORD: 'pw' } };
		const res = await actions.narration({ request: form({ password: 'pw', id, chapter: '0', text: 'Owner text.', vignettes: 'One.\nTwo.' }), platform });
		expect(res.success).toBe(true);
		expect((await getRun(db, id)).narration[0]).toEqual({ text: 'Owner text.', vignettes: ['One.', 'Two.'] });
		expect(await kv.get(`sim-narr:${id}:0`)).toBe(null);
	});

	it('rejects a wrong password', async () => {
		const res = await actions.narration({ request: form({ password: 'x', id: 'a', chapter: '0', text: 't', vignettes: '' }), platform: { env: { DB: fakeD1(), ADMIN_PASSWORD: 'pw' } } });
		expect(res.status).toBe(401);
	});

	it('unfeatures a run', async () => {
		const db = fakeD1();
		const { id } = await saveRun(db, { inputs: { seed: 2, switches: {}, startYear: 2015, endYear: 2025 }, engineVersion: 1 });
		await setFeatured(db, id, { featured: true, title: 'T', output: 'x' });
		await actions.unfeature({ request: form({ password: 'pw', id }), platform: { env: { DB: db, ADMIN_PASSWORD: 'pw' } } });
		expect((await getRun(db, id)).featured).toBe(false);
	});
});
