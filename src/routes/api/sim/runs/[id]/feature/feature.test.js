// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { POST } from './+server.js';
import { fakeD1 } from '$lib/server/test-fakes.js';
import { saveRun, listFeatured, getRun } from '$lib/server/sim-runs.js';
import { packOutput } from '$lib/game/sim/recording.js';
import { runSimulation, ENGINE_VERSION } from '$lib/game/sim/world.js';
import { validateInputs } from '$lib/game/sim/inputs.js';

const inputs = validateInputs({ seed: 3, switches: {}, startYear: 2015, endYear: 2025 }).inputs;
const setup = async () => {
	const db = fakeD1();
	const { id } = await saveRun(db, { inputs, engineVersion: ENGINE_VERSION });
	return { db, id, platform: { env: { DB: db, ADMIN_PASSWORD: 'pw' } } };
};
const call = (id, body, platform) =>
	POST({ params: { id }, request: new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), platform });

describe('POST /api/sim/runs/[id]/feature', () => {
	it('rejects a wrong password', async () => {
		const { id, platform } = await setup();
		expect((await call(id, { password: 'nope', title: 'T', output: 'x' }, platform)).status).toBe(401);
	});

	it('rejects a recording of different inputs', async () => {
		const { id, platform } = await setup();
		const other = await packOutput(runSimulation({ ...inputs, seed: 4 }));
		expect((await call(id, { password: 'pw', title: 'T', output: other }, platform)).status).toBe(400);
	});

	it('features the run with its recording', async () => {
		const { db, id, platform } = await setup();
		const output = await packOutput(runSimulation(inputs));
		expect((await call(id, { password: 'pw', title: 'Kano rises', output }, platform)).status).toBe(200);
		expect((await listFeatured(db)).map((r) => r.title)).toEqual(['Kano rises']);
		expect((await getRun(db, id)).output).toBe(output);
	});

	it('404s for an unknown run', async () => {
		const { platform } = await setup();
		expect((await call('zzzzzzzzzz', { password: 'pw', title: 'T', output: 'x' }, platform)).status).toBe(404);
	});
});
