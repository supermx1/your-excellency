// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { startRun } from './client.js';

function fakeWorker(script) {
	return () => {
		const w = {
			onmessage: null,
			onerror: null,
			terminated: false,
			postMessage() {
				queueMicrotask(() => script(w));
			},
			terminate() {
				w.terminated = true;
			}
		};
		return w;
	};
}

const inputs = { seed: 1, switches: {}, startYear: 1850, endYear: 1860 };

describe('startRun', () => {
	it('resolves the result, then the summary', async () => {
		const h = startRun(inputs, {
			extraSeeds: 2,
			workerFactory: fakeWorker((w) => {
				w.onmessage({ data: { type: 'result', run: { ok: 1 } } });
				w.onmessage({ data: { type: 'summary', runs: 2 } });
			})
		});
		expect(await h.result).toEqual({ ok: 1 });
		expect((await h.summary).runs).toBe(2);
	});

	it('rejects the result on an error message', async () => {
		const h = startRun(inputs, { workerFactory: fakeWorker((w) => w.onmessage({ data: { type: 'error', message: 'boom' } })) });
		await expect(h.result).rejects.toThrow('boom');
	});

	it('rejects on a worker error event', async () => {
		const h = startRun(inputs, { workerFactory: fakeWorker((w) => w.onerror({ message: 'crashed' })) });
		await expect(h.result).rejects.toThrow('crashed');
	});

	it('summary is null when no extra seeds were asked for', async () => {
		const h = startRun(inputs, { workerFactory: fakeWorker((w) => w.onmessage({ data: { type: 'result', run: {} } })) });
		await h.result;
		expect(await h.summary).toBe(null);
	});
});
