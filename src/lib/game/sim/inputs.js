// @ts-nocheck
// Run inputs: validation and the compact URL form used by /sim/play?s=…
import { validateSwitches } from './switches.js';

/**
 * @param {unknown} raw
 * @returns {{ ok: true, inputs: import('./types.js').RunInputs } | { ok: false, error: string }}
 */
export function validateInputs(raw) {
	if (!raw || typeof raw !== 'object') return { ok: false, error: 'missing run inputs' };
	const seed = typeof raw.seed === 'string' && /^\d+$/.test(raw.seed) ? Number(raw.seed) : raw.seed;
	if (!Number.isSafeInteger(seed)) return { ok: false, error: 'seed must be a whole number' };
	const { startYear, endYear } = raw;
	if (!Number.isInteger(startYear) || startYear < 1850 || startYear > 2025)
		return { ok: false, error: 'start year must be 1850–2025' };
	if (!Number.isInteger(endYear) || endYear <= startYear || endYear > 2100)
		return { ok: false, error: 'end year must be after the start year and no later than 2100' };
	const sw = validateSwitches(raw.switches ?? {});
	if (!sw.ok) return sw;
	return { ok: true, inputs: { seed, switches: sw.switches, startYear, endYear } };
}

/** @param {import('./types.js').RunInputs} inputs */
export function encodeInputs(inputs) {
	const bytes = new TextEncoder().encode(JSON.stringify(inputs));
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string | null | undefined} str */
export function decodeInputs(str) {
	if (!str) return { ok: false, error: 'missing run inputs' };
	try {
		const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
		const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
		return validateInputs(JSON.parse(json));
	} catch {
		return { ok: false, error: 'this run link is damaged' };
	}
}
