// @ts-nocheck
import { json } from '@sveltejs/kit';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Soft-registration capture. Validates at the trust boundary, then stores the
 *  lead in D1. In local dev without a DB binding it no-ops (logs) so the gate
 *  still works; in production it persists to the `leads` table. */
export async function POST({ request, platform }) {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request.' }, { status: 400 });
	}

	const name = String(body?.name ?? '').trim().slice(0, 80);
	const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 120);
	const country = String(body?.country ?? '').trim().slice(0, 60);
	const consent = body?.consent === true;

	if (!name || !EMAIL.test(email)) {
		return json({ error: 'A name and a valid email are required.' }, { status: 400 });
	}
	if (!consent) {
		return json({ error: 'Consent is required to register.' }, { status: 400 });
	}

	const db = platform?.env?.DB;
	if (db) {
		await db
			.prepare(
				'INSERT OR IGNORE INTO leads (id, name, email, country, consent, created_at) VALUES (?, ?, ?, ?, 1, ?)'
			)
			.bind(crypto.randomUUID(), name, email, country, new Date().toISOString())
			.run();
	} else {
		console.warn('[register] no D1 binding (dev) — lead not persisted:', email);
	}

	return json({ ok: true });
}
