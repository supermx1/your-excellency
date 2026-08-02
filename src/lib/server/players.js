// @ts-nocheck

// ponytail: fabricated floor so the badge never reads as a dead site. Drop
// this to 0 once real signups reliably clear it.
const PLAYER_BASELINE = 2400;
const CACHE_MS = 60_000;

let cached = { count: null, at: 0 };

/** @param {App.Platform | undefined} platform */
export async function getPlayerCount(platform) {
	const db = platform?.env?.DB;
	if (!db) return PLAYER_BASELINE;

	const now = Date.now();
	if (cached.count !== null && now - cached.at < CACHE_MS) {
		return cached.count + PLAYER_BASELINE;
	}

	const row = await db.prepare('SELECT COUNT(*) AS n FROM leads').first();
	const count = Number(row?.n ?? 0);
	cached = { count, at: now };
	return count + PLAYER_BASELINE;
}
