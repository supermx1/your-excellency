// @ts-nocheck
// Owner only: feature a saved run and keep its full recording, so it replays the same after engine changes.
import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/admin.js';
import { getRun, setFeatured } from '$lib/server/sim-runs.js';
import { unpackOutput } from '$lib/game/sim/recording.js';

const MAX_OUTPUT = 1_500_000; // characters of base64 (~1.1 MB gzipped)

export async function POST({ params, request, platform }) {
	const db = platform?.env?.DB;
	if (!db) return json({ error: 'Saving is unavailable right now.' }, { status: 503 });
	const body = await request.json().catch(() => ({}));
	if (!isAdmin(platform, body?.password)) return json({ error: 'Wrong admin password.' }, { status: 401 });

	const row = await getRun(db, params.id);
	if (!row) return json({ error: 'No such run.' }, { status: 404 });
	if (typeof body.output !== 'string' || body.output.length > MAX_OUTPUT) return json({ error: 'Missing or oversized recording.' }, { status: 400 });

	let recorded;
	try {
		recorded = await unpackOutput(body.output);
	} catch {
		return json({ error: 'The recording could not be read.' }, { status: 400 });
	}
	if (JSON.stringify(recorded.inputs) !== JSON.stringify(row.inputs) || recorded.engineVersion !== row.engineVersion)
		return json({ error: 'The recording does not match this run.' }, { status: 400 });

	const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : null;
	await setFeatured(db, params.id, { featured: true, title, output: body.output });
	return json({ ok: true });
}
