// @ts-nocheck
// Narration for one chapter. 400 for a malformed digest; { narration: null } means "use the built-in text".
import { json } from '@sveltejs/kit';
import { validateDigest } from '$lib/game/sim/narration.js';
import { narrate } from '$lib/server/sim-narrate.js';

export async function POST({ request, platform }) {
	const body = await request.json().catch(() => null);
	const checked = validateDigest(body?.digest);
	const chapterIndex = body?.chapterIndex;
	const runId = body?.runId;
	if (!checked.ok) return json({ error: checked.error }, { status: 400 });
	if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex > 50) return json({ error: 'bad chapter' }, { status: 400 });
	if (runId !== undefined && !/^[0-9a-zA-Z]{10}$/.test(runId)) return json({ error: 'bad run id' }, { status: 400 });
	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	const narration = await narrate(platform, { runId, chapterIndex, digest: checked.digest, ip }).catch(() => null);
	return json({ narration });
}
