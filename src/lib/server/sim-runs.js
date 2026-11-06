// @ts-nocheck
// D1 repository for The Timeline's saved runs.

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function newId() {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

async function sha256(text) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const parse = (s) => (s ? JSON.parse(s) : null);
const toRun = (r) =>
	r && {
		id: r.id,
		engineVersion: r.engine_version,
		inputs: JSON.parse(r.inputs),
		title: r.title,
		featured: Boolean(r.featured),
		narration: parse(r.narration),
		summary: parse(r.summary),
		output: r.output ?? null
	};

/** Saves a run; identical inputs (same engine version) return the existing id. */
export async function saveRun(db, { inputs, engineVersion, summary = null }) {
	const hash = await sha256(`${engineVersion}:${JSON.stringify(inputs)}`);
	const existing = await db.prepare('SELECT id FROM sim_runs WHERE inputs_hash = ?').bind(hash).first();
	if (existing) return { id: existing.id };
	const id = newId();
	await db
		.prepare('INSERT INTO sim_runs (id, inputs_hash, engine_version, inputs, summary) VALUES (?, ?, ?, ?, ?) ON CONFLICT(inputs_hash) DO NOTHING')
		.bind(id, hash, engineVersion, JSON.stringify(inputs), summary ? JSON.stringify(summary) : null)
		.run();
	// A concurrent save may have won the race; return whichever row exists.
	const row = await db.prepare('SELECT id FROM sim_runs WHERE inputs_hash = ?').bind(hash).first();
	return { id: row.id };
}

export async function getRun(db, id) {
	return toRun(await db.prepare('SELECT * FROM sim_runs WHERE id = ?').bind(id).first());
}

export async function listFeatured(db, limit = 12) {
	const { results } = await db
		.prepare('SELECT id, title, inputs, summary FROM sim_runs WHERE featured = 1 ORDER BY featured_at DESC, rowid DESC LIMIT ?')
		.bind(limit)
		.all();
	return results.map((r) => ({ id: r.id, title: r.title, inputs: JSON.parse(r.inputs), summary: parse(r.summary) }));
}

export async function setFeatured(db, id, { featured, title = null, output = null }) {
	await db
		.prepare(
			"UPDATE sim_runs SET featured = ?, title = COALESCE(?, title), output = COALESCE(?, output), featured_at = CASE WHEN ? THEN datetime('now') ELSE featured_at END WHERE id = ?"
		)
		.bind(featured ? 1 : 0, title, output, featured ? 1 : 0, id)
		.run();
}

export async function saveNarration(db, id, narration) {
	await db.prepare('UPDATE sim_runs SET narration = ? WHERE id = ?').bind(JSON.stringify(narration), id).run();
}
