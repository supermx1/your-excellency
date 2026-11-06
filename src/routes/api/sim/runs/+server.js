// @ts-nocheck
// Save a run and get a share link. A run is stored as its inputs; the browser replays it.
import { json } from '@sveltejs/kit';
import { validateInputs } from '$lib/game/sim/inputs.js';
import { ENGINE_VERSION } from '$lib/game/sim/world.js';
import { saveRun } from '$lib/server/sim-runs.js';

const DAILY_SAVES = 30;

export async function POST({ request, platform }) {
	const db = platform?.env?.DB;
	if (!db) return json({ error: 'Saving is unavailable right now.' }, { status: 503 });

	const body = await request.json().catch(() => ({}));
	const checked = validateInputs(body?.inputs);
	if (!checked.ok) return json({ error: checked.error }, { status: 400 });

	const kv = platform.env.AI_CACHE;
	if (kv) {
		const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
		const key = `sim-saves:${new Date().toISOString().slice(0, 10)}:${ip}`;
		const count = Number((await kv.get(key)) ?? 0);
		if (count >= DAILY_SAVES) return json({ error: 'Too many saves today. Try again tomorrow.' }, { status: 429 });
		await kv.put(key, String(count + 1), { expirationTtl: 60 * 60 * 26 });
	}

	// The summary is display-only; keep it small so a forged one can't bloat the table.
	const summary =
		body.summary && typeof body.summary === 'object' && JSON.stringify(body.summary).length <= 2000 ? body.summary : null;
	const { id } = await saveRun(db, { inputs: checked.inputs, engineVersion: ENGINE_VERSION, summary });
	return json({ id, url: `/sim/run/${id}` });
}
