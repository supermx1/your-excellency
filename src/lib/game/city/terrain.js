// @ts-nocheck
import { hashString, rng } from '../engine.js';
import { defaultRulebook } from './rulebook.js';

/**
 * Deterministic 8x8 (default) terrain generator — same seed always produces the
 * same map. Lays down a riverside edge, a town-centre cluster, a farmland patch
 * and a slum patch, then fills the rest with a residential/scrub gradient that
 * fades out from the town centre.
 * @param {number|string} seed
 * @param {number} [size]
 * @returns {{ x: number, y: number, type: string }[]}
 */
export function generateTerrain(seed, size = defaultRulebook.params.gridSize) {
	const seedNumber = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
	const random = rng(seedNumber ^ 0x9e3779b9);

	/** @type {string[][]} */
	const grid = Array.from({ length: size }, () => Array(size).fill('scrub'));
	const mark = (x, y, type) => {
		if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = type;
	};
	const fillRect = (x0, y0, w, h, type) => {
		for (let y = y0; y < y0 + h; y += 1) {
			for (let x = x0; x < x0 + w; x += 1) mark(x, y, type);
		}
	};

	// Riverside: a full-length band along one edge, one tile thick.
	const riverOnLeft = random() < 0.5;
	for (let i = 0; i < size; i += 1) {
		if (riverOnLeft) mark(0, i, 'riverside');
		else mark(i, 0, 'riverside');
	}

	// District sizes scale with the grid, so a 14x14 ward gets real districts
	// rather than the same 2x2 specks a small board had.
	const unit = Math.max(2, Math.round(size / 5));

	// Town centre: a cluster in the inner core, clear of the river edge.
	const coreMin = Math.max(1, Math.floor(size * 0.3));
	const coreMax = Math.max(coreMin + 1, size - Math.floor(size * 0.3) - 2);
	const centreX = coreMin + Math.floor(random() * (coreMax - coreMin));
	const centreY = coreMin + Math.floor(random() * (coreMax - coreMin));
	fillRect(centreX, centreY, unit, unit, 'town_centre');

	// Farmland: a broad belt mirrored to the opposite side from the town centre.
	const farmX = Math.max(1, Math.min(size - unit - 1, size - 1 - centreX - unit));
	const farmY = Math.max(1, Math.min(size - unit, size - 1 - centreY));
	fillRect(farmX, farmY, unit + 1, unit, 'farmland');

	// Slums: informal settlement pressure, hugging the town centre.
	const slumCount = size >= 12 ? 2 : 1;
	for (let i = 0; i < slumCount; i += 1) {
		const slumX = Math.max(
			1,
			Math.min(size - unit, centreX + (random() < 0.5 ? -unit - 1 : unit + 1))
		);
		const slumY = Math.max(1, Math.min(size - unit, centreY + (random() < 0.5 ? unit : -unit)));
		fillRect(slumX, slumY, unit, unit, 'slum');
	}

	// Everything still scrub: residential near the town centre, fading to scrub further out.
	const tiles = [];
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			let type = grid[y][x];
			if (type === 'scrub') {
				const distance = Math.max(Math.abs(x - centreX), Math.abs(y - centreY));
				const residentialChance = Math.max(0, 1 - distance / (size * 0.55));
				if (random() < residentialChance) type = 'residential';
			}
			tiles.push({ x, y, type });
		}
	}
	return tiles;
}
