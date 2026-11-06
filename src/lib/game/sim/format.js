// Number formatting for the HUD and ending.

/**
 * Electricity the way people talk about it: who is connected, and how many hours a day it runs for them.
 * @param {number | null | undefined} access share connected (0–1) @param {number | null | undefined} service usable service (0–1)
 */
export function powerText(access, service) {
	if (typeof access !== 'number' || typeof service !== 'number' || !Number.isFinite(access + service)) return null; // older recordings
	if (access < 0.005) return 'No one is connected';
	return `${Math.round(access * 100)}% connected · about ${Math.round((24 * service) / access)} hours a day`;
}

/** @param {string} key @param {number | null | undefined} v */
export function formatStat(key, v) {
	if (v == null || Number.isNaN(v)) return '—';
	if (key === 'pop') return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`;
	if (key === 'litAny' || key === 'litSchool' || key === 'urban' || key === 'electricityAccess')
		return `${Math.round(v * 100)}%`;
	if (key === 'lifeExp') return `${Math.round(v)} yrs`;
	return `${Math.round(v)}`;
}
