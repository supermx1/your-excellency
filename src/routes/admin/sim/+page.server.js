// @ts-nocheck
import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/admin.js';
import { getRun, listFeatured, saveNarration, setFeatured } from '$lib/server/sim-runs.js';

export async function load({ platform }) {
	const db = platform?.env?.DB;
	if (!db) return { runs: [], available: false };
	const featured = await listFeatured(db, 50);
	const runs = await Promise.all(featured.map(async (r) => ({ ...r, narration: (await getRun(db, r.id))?.narration ?? {} })));
	return { runs, available: true };
}

async function guard(request, platform) {
	const form = await request.formData();
	if (!isAdmin(platform, String(form.get('password') ?? ''))) return { denied: fail(401, { error: 'Wrong admin password.' }) };
	if (!platform?.env?.DB) return { denied: fail(503, { error: 'Database unavailable.' }) };
	return { form, db: platform.env.DB };
}

export const actions = {
	/** Replace one chapter's narration (empty text removes the override). */
	narration: async ({ request, platform }) => {
		const { denied, form, db } = await guard(request, platform);
		if (denied) return denied;
		const id = String(form.get('id'));
		// The page shows chapters numbered from 1 (as in the video); storage is 0-based.
		const chapter = form.has('chapterNumber') ? Number(form.get('chapterNumber')) - 1 : Number(form.get('chapter'));
		const run = await getRun(db, id);
		if (!run || !Number.isInteger(chapter) || chapter < 0) return fail(400, { error: 'Unknown run or chapter.' });
		const text = String(form.get('text') ?? '').trim().slice(0, 1200);
		const vignettes = String(form.get('vignettes') ?? '')
			.split('\n')
			.map((v) => v.trim().slice(0, 400))
			.filter(Boolean)
			.slice(0, 4);
		const narration = { ...(run.narration ?? {}) };
		if (text) narration[chapter] = { text, vignettes };
		else delete narration[chapter];
		await saveNarration(db, id, narration);
		await platform.env.AI_CACHE?.delete(`sim-narr:${id}:${chapter}`);
		return { success: true, id, chapter };
	},

	unfeature: async ({ request, platform }) => {
		const { denied, form, db } = await guard(request, platform);
		if (denied) return denied;
		await setFeatured(db, String(form.get('id')), { featured: false });
		return { success: true };
	}
};
