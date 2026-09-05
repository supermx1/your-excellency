// @ts-nocheck
import { hashString, rng } from '../engine.js';
import { defaultRulebook } from './rulebook.js';

/**
 * Deterministic terrain generator — same seed always produces the same map.
 * Generates an organic, meandering river, a town-centre cluster clear of the water,
 * farmland belts, informal slum clusters, and fading residential/scrub zoning.
 *
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
			for (let x = x0; x < x0 + w; x += 1) {
				if (grid[y] && grid[y][x] !== 'riverside') {
					mark(x, y, type);
				}
			}
		}
	};

	// 1. Riverside: Organic procedural river varying by seed
	// River style: 0 = Vertical Meander, 1 = Horizontal Meander, 2 = Curved Shoreline Bend
	const riverStyle = Math.floor(random() * 3);

	if (riverStyle === 0) {
		// Vertical meander along West or East
		const onWest = random() < 0.5;
		const amp = 1.2 + random() * 1.5;
		const freq = (1.2 + random() * 1.8) * Math.PI / size;
		const phase = random() * Math.PI * 2;
		let prevX = null;

		for (let y = 0; y < size; y++) {
			const offset = Math.round(Math.sin(y * freq + phase) * amp);
			const x = onWest
				? Math.max(0, Math.min(Math.floor(size * 0.25), offset + 1))
				: Math.max(Math.floor(size * 0.75), Math.min(size - 1, size - 2 + offset));

			if (prevX !== null && Math.abs(x - prevX) > 1) {
				const step = x > prevX ? 1 : -1;
				for (let cx = prevX + step; cx !== x; cx += step) mark(cx, y, 'riverside');
			}
			mark(x, y, 'riverside');
			prevX = x;
		}
	} else if (riverStyle === 1) {
		// Horizontal meander along North or South
		const onNorth = random() < 0.5;
		const amp = 1.2 + random() * 1.5;
		const freq = (1.2 + random() * 1.8) * Math.PI / size;
		const phase = random() * Math.PI * 2;
		let prevY = null;

		for (let x = 0; x < size; x++) {
			const offset = Math.round(Math.sin(x * freq + phase) * amp);
			const y = onNorth
				? Math.max(0, Math.min(Math.floor(size * 0.25), offset + 1))
				: Math.max(Math.floor(size * 0.75), Math.min(size - 1, size - 2 + offset));

			if (prevY !== null && Math.abs(y - prevY) > 1) {
				const step = y > prevY ? 1 : -1;
				for (let cy = prevY + step; cy !== y; cy += step) mark(x, cy, 'riverside');
			}
			mark(x, y, 'riverside');
			prevY = y;
		}
	} else {
		// Curved shoreline bend from one edge sweeping across to an adjacent edge
		const startCorner = Math.floor(random() * 4); // 0: NW, 1: NE, 2: SW, 3: SE
		const startX = startCorner % 2 === 0 ? 0 : size - 1;
		const startY = startCorner < 2 ? 0 : size - 1;
		const endX = startCorner % 2 === 0 ? Math.floor(size * 0.65) : Math.floor(size * 0.35);
		const endY = startCorner < 2 ? Math.floor(size * 0.65) : Math.floor(size * 0.35);

		let prevX = startX;
		let prevY = startY;
		for (let i = 0; i < size; i++) {
			const t = i / (size - 1);
			const x = Math.round(startX + (endX - startX) * t + Math.sin(t * Math.PI) * 1.5);
			const y = Math.round(startY + (endY - startY) * t - Math.sin(t * Math.PI) * 1.5);
			const clampedX = Math.max(0, Math.min(size - 1, x));
			const clampedY = Math.max(0, Math.min(size - 1, y));

			// Connect line
			let cx = prevX;
			let cy = prevY;
			while (cx !== clampedX || cy !== clampedY) {
				if (cx !== clampedX) cx += clampedX > cx ? 1 : -1;
				else if (cy !== clampedY) cy += clampedY > cy ? 1 : -1;
				mark(cx, cy, 'riverside');
			}
			mark(clampedX, clampedY, 'riverside');
			prevX = clampedX;
			prevY = clampedY;
		}
	}

	// 2. District sizes scale with the grid
	const unit = Math.max(2, Math.round(size / 5));

	// 3. Town centre: cluster in the inner core clear of the river
	const coreMin = Math.max(1, Math.floor(size * 0.3));
	const coreMax = Math.max(coreMin + 1, size - Math.floor(size * 0.3) - 2);
	let centreX = coreMin + Math.floor(random() * (coreMax - coreMin));
	let centreY = coreMin + Math.floor(random() * (coreMax - coreMin));

	// If candidate centre overlaps river, nudge away
	if (grid[centreY] && grid[centreY][centreX] === 'riverside') {
		centreX = Math.max(2, Math.min(size - unit - 2, Math.floor(size / 2)));
		centreY = Math.max(2, Math.min(size - unit - 2, Math.floor(size / 2)));
	}
	fillRect(centreX, centreY, unit, unit, 'town_centre');

	// 4. Farmland: broad belt mirrored to opposite side from town centre
	const farmX = Math.max(1, Math.min(size - unit - 1, size - 1 - centreX - unit));
	const farmY = Math.max(1, Math.min(size - unit, size - 1 - centreY));
	fillRect(farmX, farmY, unit + 1, unit, 'farmland');

	// 5. Slums: informal settlement hugging the town centre
	const slumCount = size >= 12 ? 2 : 1;
	for (let i = 0; i < slumCount; i += 1) {
		const slumX = Math.max(
			1,
			Math.min(size - unit, centreX + (random() < 0.5 ? -unit - 1 : unit + 1))
		);
		const slumY = Math.max(1, Math.min(size - unit, centreY + (random() < 0.5 ? unit : -unit)));
		fillRect(slumX, slumY, unit, unit, 'slum');
	}

	// 6. Scrub & Residential gradient around town centre
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
