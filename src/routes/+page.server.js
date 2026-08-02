// @ts-nocheck
import { getPlayerCount } from '$lib/server/players.js';

export async function load({ platform }) {
	return { playerCount: await getPlayerCount(platform) };
}
