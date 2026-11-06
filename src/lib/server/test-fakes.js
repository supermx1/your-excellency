// @ts-nocheck
// In-memory stand-ins for Cloudflare bindings, for vitest only.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const MIGRATIONS = new URL('../../../migrations/', import.meta.url);

/** A D1-shaped wrapper over an in-memory SQLite database with every migration applied. */
export function fakeD1() {
	const db = new DatabaseSync(':memory:');
	for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort())
		db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'));
	const statement = (sql, args = []) => ({
		bind: (...a) => statement(sql, a),
		first: async () => db.prepare(sql).get(...args) ?? null,
		all: async () => ({ results: db.prepare(sql).all(...args) }),
		run: async () => {
			const r = db.prepare(sql).run(...args);
			return { meta: { changes: Number(r.changes) } };
		}
	});
	return { prepare: (sql) => statement(sql) };
}

export function fakeKV() {
	const store = new Map();
	return {
		store,
		get: async (k) => store.get(k) ?? null,
		put: async (k, v) => void store.set(k, String(v)),
		delete: async (k) => void store.delete(k)
	};
}

/** Workers AI stand-in; `responder(model, input)` returns the model output (or a Promise). */
export function fakeAI(responder) {
	const calls = [];
	return {
		calls,
		run: async (model, input) => {
			calls.push({ model, input });
			return responder(model, input);
		}
	};
}
