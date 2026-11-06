// Builds src/lib/game/sim/data/cells.json from the @svg-maps/nigeria state shapes:
// centroid, area (viewBox units²), coastal and river flags and neighbours (shapes that touch).
import map from '@svg-maps/nigeria';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parsePath } from '../../src/lib/game/sim/svgpath.js';

const OUT = new URL('../../src/lib/game/sim/data/cells.json', import.meta.url);
// ponytail: the SVG has no sea polygon, so coast is hand-listed.
const COASTAL = new Set(['lagos', 'ogun', 'ondo', 'delta', 'bayelsa', 'rivers', 'akwa-ibom', 'cross-river']);
// ponytail: states the Niger or Benue runs through, from the Natural Earth river lines (geo.test.js checks it).
const RIVER = new Set(['kebbi', 'niger', 'kogi', 'anambra', 'delta', 'rivers', 'bayelsa', 'adamawa', 'taraba', 'nassarawa', 'benue']);
const TOUCH = 1.5; // viewBox units; vertices closer than this count as a shared border

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
	river: RIVER.has(s.id),
	neighbours: shapes.filter((o) => o !== s && touches(s, o)).map((o) => o.id)
}));

mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(cells, null, '\t') + '\n');
console.log(`cells.json: ${cells.length} cells`);
