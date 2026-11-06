// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { fakeD1 } from './test-fakes.js';
import { saveRun, getRun, listFeatured, setFeatured, saveNarration } from './sim-runs.js';
import { isAdmin } from './admin.js';

const inputs = (seed) => ({ seed, switches: { learning: 3 }, startYear: 1850, endYear: 2025 });

describe('sim runs repository', () => {
	it('saves a run and reads it back', async () => {
		const db = fakeD1();
		const { id } = await saveRun(db, { inputs: inputs(1), engineVersion: 1 });
		expect(id).toMatch(/^[0-9a-zA-Z]{10}$/);
		const row = await getRun(db, id);
		expect(row.inputs).toEqual(inputs(1));
		expect(row.engineVersion).toBe(1);
		expect(row.featured).toBe(false);
		expect(row.narration).toBe(null);
	});

	it('saving identical inputs twice returns the same id', async () => {
		const db = fakeD1();
		const a = await saveRun(db, { inputs: inputs(2), engineVersion: 1 });
		const b = await saveRun(db, { inputs: inputs(2), engineVersion: 1 });
		expect(b.id).toBe(a.id);
	});

	it('unknown ids read as null', async () => expect(await getRun(fakeD1(), 'nope')).toBe(null));

	it('lists only featured runs, newest first', async () => {
		const db = fakeD1();
		const a = await saveRun(db, { inputs: inputs(3), engineVersion: 1 });
		const b = await saveRun(db, { inputs: inputs(4), engineVersion: 1 });
		await saveRun(db, { inputs: inputs(5), engineVersion: 1 });
		await setFeatured(db, a.id, { featured: true, title: 'First', output: 'x' });
		await setFeatured(db, b.id, { featured: true, title: 'Second', output: 'y' });
		expect((await listFeatured(db)).map((r) => r.title)).toEqual(['Second', 'First']);
		await saveNarration(db, a.id, { 0: { text: 'hi', vignettes: [] } });
		expect((await getRun(db, a.id)).narration[0].text).toBe('hi');
	});
});

describe('admin password', () => {
	it('accepts the env password and rejects others', () => {
		const platform = { env: { ADMIN_PASSWORD: 'secret' } };
		expect(isAdmin(platform, 'secret')).toBe(true);
		expect(isAdmin(platform, 'emeka-local-admin')).toBe(false);
		expect(isAdmin({ env: {} }, 'emeka-local-admin')).toBe(false); // no secret, no admin
		expect(isAdmin(platform, 'secre')).toBe(false);
		expect(isAdmin(platform, 'secret!')).toBe(false);
	});
});
