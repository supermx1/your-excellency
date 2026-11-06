// @ts-nocheck
// A run's full recording as a compact string: JSON → gzip → base64.

async function pipe(bytes, stream) {
	return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

function toBase64(bytes) {
	let bin = '';
	for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(bin);
}

/** @param {import('./types.js').RunResult} run */
export async function packOutput(run) {
	return toBase64(await pipe(new TextEncoder().encode(JSON.stringify(run)), new CompressionStream('gzip')));
}

/** @param {string} packed @returns {Promise<import('./types.js').RunResult>} */
export async function unpackOutput(packed) {
	const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
	return JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream('gzip'))));
}
