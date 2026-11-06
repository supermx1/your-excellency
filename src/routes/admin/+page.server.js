// @ts-nocheck
import { fail } from '@sveltejs/kit';
import { defaultRulebook } from '$lib/game/rulebook.js';
import { readRulebook, writeRulebook } from '$lib/server/rulebook.js';
import { isAdmin } from '$lib/server/admin.js';

export async function load({ platform }) {
	let provisions = null;
	try {
		provisions = await readRulebook(platform);
	} catch {
		provisions = null;
	}
	return {
		provisions: provisions ?? defaultRulebook.provisions,
		fromDefault: !provisions,
		configured: Boolean(platform?.env?.ADMIN_PASSWORD)
	};
}

export const actions = {
	default: async ({ request, platform }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const json = String(form.get('provisions') ?? '');

		if (!isAdmin(platform, password)) {
			return fail(401, { error: 'Wrong admin password.' });
		}

		let provisions;
		try {
			provisions = JSON.parse(json);
		} catch {
			return fail(400, { error: 'Rulebook JSON is invalid — nothing was saved.', provisions: json });
		}
		if (!Array.isArray(provisions) || provisions.some((p) => !p || typeof p.id !== 'string')) {
			return fail(400, {
				error: 'Rulebook must be an array of provisions, each with a string id.',
				provisions: json
			});
		}

		try {
			await writeRulebook(platform, provisions);
		} catch (e) {
			return fail(500, { error: `Could not save to D1: ${e.message}`, provisions: json });
		}
		return { success: true, count: provisions.length };
	}
};
