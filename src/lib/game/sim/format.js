// Number formatting for the HUD and ending.

/**
 * Electricity the way people talk about it: who is connected, and how many hours a day it runs for them.
 * @param {number | null | undefined} access share connected (0–1) @param {number | null | undefined} service usable service (0–1)
 */
export function powerText(access, service) {
	if (
		typeof access !== 'number' ||
		typeof service !== 'number' ||
		!Number.isFinite(access + service)
	)
		return null; // older recordings
	if (access < 0.005) return 'No one is connected';
	return `${Math.round(access * 100)}% connected · about ${Math.round((24 * service) / access)} hours a day`;
}

/** A head count, short enough to sit on the map: 23M, 4.5M, 450k. @param {number} v */
export function shortPeople(v) {
	if (v >= 1e7) return `${Math.round(v / 1e6)}M`;
	if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
	return `${Math.round(v / 1e3)}k`;
}

/** @param {string} key @param {number | null | undefined} v */
export function formatStat(key, v) {
	if (v == null || Number.isNaN(v)) return '—';
	if (key === 'pop') return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`;
	if (key === 'litAny' || key === 'litSchool' || key === 'urban' || key === 'electricityAccess')
		return `${Math.round(v * 100)}%`;
	if (key === 'lifeExp') return `${Math.round(v)} yrs`;
	if (key === 'incomePc') return `$${(Math.round(v / 10) * 10).toLocaleString('en-US')}`;
	return `${Math.round(v)}`;
}
