// Number formatting for the HUD and ending.

/** @param {string} key @param {number | null | undefined} v */
export function formatStat(key, v) {
	if (v == null || Number.isNaN(v)) return '—';
	if (key === 'pop') return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`;
	if (key === 'litAny' || key === 'urban') return `${Math.round(v * 100)}%`;
	if (key === 'lifeExp') return `${Math.round(v)} yrs`;
	return `${Math.round(v)}`;
}
