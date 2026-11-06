// Natural Earth outlines → world.json (globe, lon/lat) and region.json (neighbours, SVG units).
// Also fits the lon/lat → SVG transform for the @svg-maps/nigeria map (it has no documented projection).
import { readFileSync, writeFileSync } from 'node:fs';
import map from '@svg-maps/nigeria';
import { parsePath } from '../../src/lib/game/sim/svgpath.js';

const CACHE = new URL('./.cache/', import.meta.url);
const OUT = new URL('../../src/lib/game/sim/data/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, CACHE), 'utf8'));
const r1 = (n) => Math.round(n * 10) / 10;
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const ringsOf = (f) => polys(f.geometry).flat();

// --- world.json: 110m outlines rounded to 0.1° ---------------------------------
const dedupe = (ring, min) =>
	ring.filter((p, i) => i === 0 || Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]) >= min);
const world = read('ne-110m-countries.geojson').features.map((f) => ({
	id: f.properties.ADM0_A3,
	name: f.properties.NAME,
	rings: ringsOf(f)
		.map((r) => dedupe(r.map(([x, y]) => [r1(x), r1(y)]), 0.1))
		.filter((r) => r.length > 2)
}));
writeFileSync(new URL('world.json', OUT), JSON.stringify(world));

// --- fit ------------------------------------------------------------------------
const ne50 = read('ne-50m-countries.geojson').features;
const nga = ringsOf(ne50.find((f) => f.properties.ADM0_A3 === 'NGA')).flat();
const svg = map.locations.flatMap((l) => parsePath(l.path)).flat();
const bbox = (pts) => [0, 1].map((k) => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))]);
const [[lon0, lon1], [lat0, lat1]] = bbox(nga);
const [[x0, x1], [y0, y1]] = bbox(svg);
const cells = JSON.parse(readFileSync(new URL('cells.json', OUT), 'utf8'));
const centroid = (id) => cells.find((c) => c.id === id).centroid;
const CITIES = [['kano', 8.52, 12.0], ['lagos', 3.39, 6.45], ['borno', 13.16, 11.85], ['cross-river', 8.33, 4.95]];

/** weighted least squares for v = a·u + b */
function line(pairs) {
	let sw = 0, su = 0, sv = 0, suu = 0, suv = 0;
	for (const [u, v, w] of pairs) {
		sw += w; su += w * u; sv += w * v; suu += w * u * u; suv += w * u * v;
	}
	const a = (sw * suv - su * sv) / (sw * suu - su * su);
	return [a, (sv - a * su) / sw];
}
const LAT = {
	equirect: (lat) => lat,
	mercator: (lat) => (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
};
const BOX_WEIGHT = 4; // ponytail: bbox edges dominate; city→state-centroid pairs only nudge (a city is not its state's centre)
const fits = Object.entries(LAT).map(([kind, f]) => {
	const [a, b] = line([[lon0, x0, BOX_WEIGHT], [lon1, x1, BOX_WEIGHT], ...CITIES.map(([id, lon]) => [lon, centroid(id)[0], 1])]);
	const [c, d] = line([[f(lat1), y0, BOX_WEIGHT], [f(lat0), y1, BOX_WEIGHT], ...CITIES.map(([id, , lat]) => [f(lat), centroid(id)[1], 1])]);
	const error = Math.max(
		Math.abs(a * lon0 + b - x0), Math.abs(a * lon1 + b - x1),
		Math.abs(c * f(lat1) + d - y0), Math.abs(c * f(lat0) + d - y1)
	);
	return { kind, a, b, c, d, error: r1(error) };
});
const fit = fits.sort((p, q) => p.error - q.error)[0];
const project = ([lon, lat]) => [fit.a * lon + fit.b, fit.c * LAT[fit.kind](lat) + fit.d];

// --- region.json: neighbours clipped to the frame, in SVG units -----------------
const FRAME = { lon0: -1, lon1: 17, lat0: 1, lat1: 17 };
/** Sutherland–Hodgman against the frame rectangle */
function clip(ring) {
	const edges = [
		[(p) => p[0] >= FRAME.lon0, 0, FRAME.lon0], [(p) => p[0] <= FRAME.lon1, 0, FRAME.lon1],
		[(p) => p[1] >= FRAME.lat0, 1, FRAME.lat0], [(p) => p[1] <= FRAME.lat1, 1, FRAME.lat1]
	];
	let out = ring;
	for (const [inside, k, v] of edges) {
		const src = out;
		out = [];
		for (let i = 0; i < src.length; i++) {
			const p = src[i];
			const q = src[(i + 1) % src.length];
			const cut = () => {
				const t = (v - p[k]) / (q[k] - p[k]);
				return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
			};
			if (inside(p)) {
				out.push(p);
				if (!inside(q)) out.push(cut());
			} else if (inside(q)) out.push(cut());
		}
	}
	return out;
}
function areaCentroid(ring) {
	let a = 0, cx = 0, cy = 0;
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[(i + 1) % ring.length];
		const k = x1 * y2 - x2 * y1;
		a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k;
	}
	return { area: Math.abs(a / 2), at: [r1(cx / (3 * a)), r1(cy / (3 * a))] };
}
const NEIGHBOURS = ['BEN', 'NER', 'TCD', 'CMR', 'TGO', 'GNQ'];
const neighbours = NEIGHBOURS.map((id) => {
	const f = ne50.find((x) => x.properties.ADM0_A3 === id);
	const rings = ringsOf(f)
		.map((r) => dedupe(clip(r).map(project).map(([x, y]) => [r1(x), r1(y)]), 1))
		.filter((r) => r.length > 2);
	const biggest = rings.map(areaCentroid).sort((p, q) => q.area - p.area)[0];
	return { id, name: f.properties.NAME, rings, label: biggest.at };
});
// --- rivers and lakes: Niger, Benue, Lake Chad, Kainji --------------------------
const inFrame = ([lon, lat]) => lon >= FRAME.lon0 && lon <= FRAME.lon1 && lat >= FRAME.lat0 && lat <= FRAME.lat1;
/** Polyline → the runs of points inside the frame (ponytail: drops the edge sliver, invisible at this scale). */
const clipLine = (line) =>
	line.reduce((runs, p) => {
		if (!inFrame(p)) runs.push([]);
		else runs.at(-1).push(p);
		return runs;
	}, [[]]);
const svgLine = (pts) => dedupe(pts.map(project).map(([x, y]) => [r1(x), r1(y)]), 1);
const rivers = read('ne-50m-rivers.geojson')
	.features.filter((f) => ['Niger', 'Benue'].includes(f.properties.name))
	.map((f) => ({
		name: f.properties.name,
		lines: (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates)
			.flatMap(clipLine)
			.map(svgLine)
			.filter((l) => l.length > 1)
	}))
	.filter((r) => r.lines.length);
const lakes = read('ne-50m-lakes.geojson')
	.features.filter((f) => ['Lake Chad', 'Kainji Reservoir'].includes(f.properties.name))
	.map((f) => ({
		name: f.properties.name,
		rings: ringsOf(f).map((r) => svgLine(clip(r))).filter((r) => r.length > 2)
	}));

const [fx0, fy0] = project([FRAME.lon0, FRAME.lat1]);
const [fx1, fy1] = project([FRAME.lon1, FRAME.lat0]);
writeFileSync(
	new URL('region.json', OUT),
	JSON.stringify({ fit, frame: { x0: r1(fx0), y0: r1(fy0), x1: r1(fx1), y1: r1(fy1) }, neighbours, rivers, lakes })
);
console.log(`world: ${world.length} countries; fit ${fit.kind} error ${fit.error} (other: ${fits[1].kind} ${fits[1].error})`);
