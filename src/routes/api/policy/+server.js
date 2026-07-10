// @ts-nocheck
import { json } from '@sveltejs/kit';
import { runPolicySim } from '$lib/server/policy-sim.js';
import { readRulebook } from '$lib/server/rulebook.js';
import { defaultRulebook } from '$lib/game/rulebook.js';

export async function POST({ request, platform }) {
	const { policy, ctx } = await request.json().catch(() => ({}));
	if (!policy?.title || typeof policy.title !== 'string') {
		return json({ response: null }, { status: 400 });
	}

	let provisions = null;
	try {
		provisions = await readRulebook(platform);
	} catch {
		// D1/KV unavailable → ground on defaults
	}

	const response = await runPolicySim(platform, policy, ctx ?? {}, provisions ?? defaultRulebook.provisions);
	return json({ response }); // null → client uses the deterministic fallback
}
