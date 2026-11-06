// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { load } from './+page.server.js';
import { fakeD1 } from '$lib/server/test-fakes.js';
import { saveRun } from '$lib/server/sim-runs.js';
import { ENGINE_VERSION } from '$lib/game/sim/world.js';

const inputs = { seed: 1, switches: {}, startYear: 1850, endYear: 2025 };

describe('share page load', () => {
	it('returns the saved run', async () => {
		const db = fakeD1();
		const { id } = await saveRun(db, { inputs, engineVersion: ENGINE_VERSION });
		const data = await load({ params: { id }, platform: { env: { DB: db } } });
		expect(data.inputs).toEqual(inputs);
		expect(data.olderEngine).toBe(false);
	});

	it('flags runs made by an older engine', async () => {
		const db = fakeD1();
		const { id } = await saveRun(db, { inputs, engineVersion: ENGINE_VERSION - 1 });
		expect((await load({ params: { id }, platform: { env: { DB: db } } })).olderEngine).toBe(true);
	});

	it('404s for unknown runs', async () => {
		await expect(load({ params: { id: 'doesnotexs' }, platform: { env: { DB: fakeD1() } } })).rejects.toMatchObject({ status: 404 });
	});
});
