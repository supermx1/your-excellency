// @ts-nocheck
import { listFeatured } from '$lib/server/sim-runs.js';

export async function load({ platform }) {
	const db = platform?.env?.DB;
	if (!db) return { featured: [] };
	return { featured: await listFeatured(db).catch(() => []) };
}
