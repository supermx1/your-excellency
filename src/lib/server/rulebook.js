// @ts-nocheck
// Rulebook persistence (PRD §6): D1 `rule_provisions` is the source of truth,
// KV `RULEBOOK_CACHE` is the read cache. Falls back to null when neither is set
// so the caller can use the built-in defaultRulebook.
const DOC_ID = 'your-excellency-rulebook';
const KV_KEY = 'rulebook:provisions';

/** D1 row → in-game provision shape. */
function rowToProvision(r) {
	return {
		id: r.id,
		document: r.document_id,
		title: r.title,
		body: r.body_text,
		tags: JSON.parse(r.tags_json || '[]'),
		params: JSON.parse(r.params_json || '{}'),
		effective_from: r.effective_from
	};
}

/** Read current provisions: KV cache first, then D1. Returns null when unset. */
export async function readRulebook(platform) {
	const kv = platform?.env?.RULEBOOK_CACHE;
	const db = platform?.env?.DB;

	if (kv) {
		const cached = await kv.get(KV_KEY);
		if (cached) return JSON.parse(cached);
	}
	if (!db) return null;

	const { results } = await db
		.prepare('SELECT * FROM rule_provisions WHERE document_id = ? ORDER BY id')
		.bind(DOC_ID)
		.all();
	if (!results?.length) return null;

	const provisions = results.map(rowToProvision);
	if (kv) await kv.put(KV_KEY, JSON.stringify(provisions)); // warm the cache
	return provisions;
}

/** Persist provisions to D1 (atomic batch) and refresh the KV cache. */
export async function writeRulebook(platform, provisions) {
	const db = platform?.env?.DB;
	const kv = platform?.env?.RULEBOOK_CACHE;
	if (!db) throw new Error('No D1 binding available.');

	const today = new Date().toISOString().slice(0, 10);
	const stmts = [
		db
			.prepare(
				`INSERT OR IGNORE INTO rule_documents (id, title, version, effective_from, status)
				 VALUES (?, 'Your Excellency rulebook', 'admin', ?, 'active')`
			)
			.bind(DOC_ID, today)
	];

	for (const p of provisions) {
		stmts.push(
			db
				.prepare(
					`INSERT OR REPLACE INTO rule_provisions
					 (id, document_id, title, body_text, tags_json, params_json, effective_from, effective_to)
					 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
				)
				.bind(
					p.id,
					DOC_ID,
					p.title ?? '',
					p.body ?? '',
					JSON.stringify(p.tags ?? []),
					JSON.stringify(p.params ?? {}),
					p.effective_from ?? today
				)
		);
	}

	// drop provisions removed in this edit
	const ids = provisions.map((p) => p.id);
	const placeholders = ids.map(() => '?').join(',') || "''";
	stmts.push(
		db.prepare(`DELETE FROM rule_provisions WHERE document_id = ? AND id NOT IN (${placeholders})`).bind(DOC_ID, ...ids)
	);

	await db.batch(stmts);
	if (kv) await kv.put(KV_KEY, JSON.stringify(provisions));
}
