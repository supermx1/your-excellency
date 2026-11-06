// @ts-nocheck
// Nigeria's 37 state shapes as Three.js shapes in a centred, 20-unit-wide map, plus the
// border segments shared by each pair of neighbouring states.
import * as THREE from 'three';
import map from '@svg-maps/nigeria';
import { parsePath } from '$lib/game/sim/svgpath.js';

const [, , VB_W, VB_H] = map.viewBox.split(' ').map(Number);
export const SCALE = 20 / VB_W;
const TOUCH = 1.5;

/** SVG [x, y] → world [x, z] (map centred on the origin, y down becomes z towards the viewer). */
export const toWorld = ([x, y]) => [(x - VB_W / 2) * SCALE, (y - VB_H / 2) * SCALE];

let rings;
const allRings = () => (rings ??= new Map(map.locations.map((l) => [l.id, parsePath(l.path)])));

let shapes;
/** @returns {Map<string, THREE.Shape[]>} one Shape per ring, in world x / −z (so a −90° X rotation lays it flat) */
export function cellShapes() {
	return (shapes ??= new Map(
		[...allRings()].map(([id, rs]) => [
			id,
			rs.map((ring) => new THREE.Shape(ring.map((p) => {
				const [x, z] = toWorld(p);
				return new THREE.Vector2(x, -z);
			})))
		])
	));
}

let edges;
/** @returns {Map<string, number[]>} "a|b" (sorted ids) → flat [x,y,z, x,y,z, …] line-segment pairs on the shared border */
export function sharedEdges() {
	if (edges) return edges;
	edges = new Map();
	const all = [...allRings()];
	for (let i = 0; i < all.length; i++) {
		for (let j = i + 1; j < all.length; j++) {
			const [a, ra] = all[i];
			const [b, rb] = all[j];
			const others = rb.flat();
			const segs = [];
			for (const ring of ra) {
				const near = ring.map(([x, y]) => others.some(([u, v]) => Math.abs(x - u) < TOUCH && Math.abs(y - v) < TOUCH));
				for (let k = 0; k < ring.length; k++) {
					const n = (k + 1) % ring.length;
					if (!near[k] || !near[n]) continue;
					const [x1, z1] = toWorld(ring[k]);
					const [x2, z2] = toWorld(ring[n]);
					segs.push(x1, 0, z1, x2, 0, z2);
				}
			}
			if (segs.length) edges.set([a, b].sort().join('|'), segs);
		}
	}
	return edges;
}
