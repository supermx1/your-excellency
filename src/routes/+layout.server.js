// @ts-nocheck
import { readRulebook } from '$lib/server/rulebook.js';

// Feed the live rulebook (D1/KV) to every page. Null → the client keeps the
// built-in defaultRulebook, so the game still works with no DB configured.
export async function load({ platform }) {
	let provisions = null;
	try {
		provisions = await readRulebook(platform);
	} catch {
		provisions = null;
	}
	return { provisions };
}
