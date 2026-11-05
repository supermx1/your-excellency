// Builds src/lib/game/sim/data/cells.json from the @svg-maps/nigeria state shapes:
// centroid, area (viewBox units²), coastal flag and neighbours (shapes that touch).
import map from '@svg-maps/nigeria';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../../src/lib/game/sim/data/cells.json', import.meta.url);
// ponytail: the SVG has no sea polygon, so coast is hand-listed.
const COASTAL = new Set(['lagos', 'ogun', 'ondo', 'delta', 'bayelsa', 'rivers', 'akwa-ibom', 'cross-river']);
const TOUCH = 1.5; // viewBox units; vertices closer than this count as a shared border

/** Paths only use `m` (relative, implicit lineto) and `z`. Returns rings of [x,y]. */
export function parsePath(d) {
	const rings = [];
	let ring = null;
	let x = 0;
	let y = 0;
	for (const token of d.match(/[mz]|-?\d*\.?\d+(?:e-?\d+)?,-?\d*\.?\d+(?:e-?\d+)?/gi)) {
		if (token === 'm') {
			ring = [];
			rings.push(ring);
		} else if (token === 'z') {
			ring = null;
		} else {
			const [dx, dy] = token.split(',').map(Number);
			if (!ring) {
				ring = [];
				rings.push(ring);
			}
			x += dx;
			y += dy;
			ring.push([x, y]);
		}
	}
	return rings.filter((r) => r.length > 2);
}

const area = (ring) =>
	Math.abs(ring.reduce((s, [x, y], i) => {
		const [nx, ny] = ring[(i + 1) % ring.length];
		return s + x * ny - nx * y;
	}, 0)) / 2;

const shapes = map.locations.map((l) => {
	const rings = parsePath(l.path);
	const points = rings.flat();
	return {
		id: l.id,
		name: l.name,
		points,
		area: rings.reduce((s, r) => s + area(r), 0),
		centroid: [
			points.reduce((s, p) => s + p[0], 0) / points.length,
			points.reduce((s, p) => s + p[1], 0) / points.length
		]
	};
});

// ponytail: O(n²·v²) vertex scan, fine for 37 shapes at build time.
const touches = (a, b) =>
	a.points.some(([x, y]) => b.points.some(([u, v]) => Math.abs(x - u) < TOUCH && Math.abs(y - v) < TOUCH));

const cells = shapes.map((s) => ({
	id: s.id,
	name: s.name,
	centroid: s.centroid.map((n) => Math.round(n * 10) / 10),
	area: Math.round(s.area),
	coastal: COASTAL.has(s.id),
	neighbours: shapes.filter((o) => o !== s && touches(s, o)).map((o) => o.id)
}));

mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(cells, null, '\t') + '\n');
console.log(`cells.json: ${cells.length} cells`);
