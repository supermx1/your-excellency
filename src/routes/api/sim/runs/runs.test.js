// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { POST } from './+server.js';
import { fakeD1, fakeKV } from '$lib/server/test-fakes.js';

const good = { seed: 9, switches: {}, startYear: 1850, endYear: 2025 };
const call = (body, platform, ip = '1.2.3.4') =>
	POST({
		request: new Request('http://x/api/sim/runs', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
			body: JSON.stringify(body)
		}),
		platform
	});
const env = () => ({ env: { DB: fakeD1(), AI_CACHE: fakeKV() } });

describe('POST /api/sim/runs', () => {
	it('saves valid inputs and returns a share link', async () => {
		const res = await call({ inputs: good }, env());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.url).toBe(`/sim/run/${body.id}`);
	});

	it('rejects invalid inputs with 400', async () => {
		const res = await call({ inputs: { ...good, startYear: 1700 } }, env());
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/start year/);
	});

	it('double save returns the same id', async () => {
		const platform = env();
		const a = await (await call({ inputs: good }, platform)).json();
		const b = await (await call({ inputs: good }, platform)).json();
		expect(b.id).toBe(a.id);
	});

	it('limits one visitor to 30 saves a day', async () => {
		const platform = env();
		for (let i = 0; i < 30; i++) expect((await call({ inputs: { ...good, seed: i } }, platform)).status).toBe(200);
		expect((await call({ inputs: { ...good, seed: 99 } }, platform)).status).toBe(429);
		expect((await call({ inputs: { ...good, seed: 99 } }, platform, '5.6.7.8')).status).toBe(200);
	});

	it('is unavailable without a database', async () => {
		expect((await call({ inputs: good }, { env: {} })).status).toBe(503);
	});
});
