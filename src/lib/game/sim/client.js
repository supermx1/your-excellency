// @ts-nocheck
// Runs the engine in a Web Worker. Errors reject `result`, so pages never spin forever.

const defaultFactory = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

/**
 * @param {import('./types.js').RunInputs} inputs
 * @param {{ extraSeeds?: number, workerFactory?: () => Worker }} [opts]
 */
export function startRun(inputs, { extraSeeds = 0, workerFactory = defaultFactory } = {}) {
	const worker = workerFactory();
	let settleResult;
	let settleSummary;
	const result = new Promise((resolve, reject) => (settleResult = { resolve, reject }));
	const summary = new Promise((resolve) => (settleSummary = resolve));
	result.catch(() => settleSummary(null));

	const fail = (message) => {
		settleResult.reject(new Error(message || 'the simulation failed'));
		settleSummary(null);
		worker.terminate();
	};
	worker.onerror = (e) => fail(e?.message);
	worker.onmessage = ({ data }) => {
		if (data.type === 'result') {
			settleResult.resolve(data.run);
			if (!extraSeeds) {
				settleSummary(null);
				worker.terminate();
			}
		} else if (data.type === 'summary') {
			const { type, ...rest } = data;
			settleSummary(rest);
			worker.terminate();
		} else if (data.type === 'error') fail(data.message);
	};
	worker.postMessage({ inputs, extraSeeds });
	return { result, summary, cancel: () => worker.terminate() };
}
