// @ts-nocheck
// Nigeria's surroundings: the sea, the neighbours (dimmed, named as they were in that year),
// and the Niger, Benue, Lake Chad and Kainji draped over the map.
import * as THREE from 'three';
import { toWorld, allRings } from './geometry.js';
import { region } from '$lib/game/sim/data/index.js';
import { neighbourName } from '$lib/game/sim/geo.js';

const SEA = new THREE.Color('#0f2236');
const LAND = SEA.clone().lerp(new THREE.Color('#3a4a3f'), 0.6);
const WATER = '#3d7fc4';
const TOP = 0.25; // Nigeria's extrusion height (Diorama DEPTH)
const RIVER_WIDTH = 0.09;

const shapeOf = (ring) =>
	new THREE.Shape(
		ring.map((p) => {
			const [x, z] = toWorld(p);
			return new THREE.Vector2(x, -z);
		})
	);

const inside = ([x, y], ring) => {
	let c = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
};
/** Height of the ground at an SVG point: on top of Nigeria's blocks, or just above the flat neighbours. */
const groundAt = (p) => ([...allRings().values()].some((rs) => rs.some((r) => inside(p, r))) ? TOP + 0.012 : 0.012);

/** A flat ribbon along a polyline (WebGL lines are always 1px, too thin for a river). */
function ribbon(line) {
	const pts = line.map((p) => {
		const [x, z] = toWorld(p);
		return [x, groundAt(p), z];
	});
	const pos = [];
	const idx = [];
	pts.forEach(([x, y, z], i) => {
		const [ax, , az] = pts[Math.max(0, i - 1)];
		const [bx, , bz] = pts[Math.min(pts.length - 1, i + 1)];
		const len = Math.hypot(bx - ax, bz - az) || 1;
		const nx = (-(bz - az) / len) * (RIVER_WIDTH / 2);
		const nz = ((bx - ax) / len) * (RIVER_WIDTH / 2);
		pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
		if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
	});
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	return g;
}

export function labelTexture(text, color = 'rgba(255,255,255,0.5)') {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const font = '600 44px system-ui, sans-serif';
	ctx.font = font;
	canvas.width = Math.ceil(ctx.measureText(text).width) + 16;
	canvas.height = 64;
	ctx.font = font;
	ctx.textBaseline = 'middle';
	if (color !== 'rgba(255,255,255,0.5)') {
		// Map figures sit over bright colours, so they get a dark outline.
		ctx.lineWidth = 8;
		ctx.strokeStyle = 'rgba(0,0,0,0.75)';
		ctx.strokeText(text, 8, 32);
	}
	ctx.fillStyle = color;
	ctx.fillText(text, 8, 32);
	return new THREE.CanvasTexture(canvas);
}

/** Adds the surroundings to `scene`. @returns {{ setYear: (year: number) => void, dispose: () => void }} */
export function addNeighbours(scene) {
	const group = new THREE.Group();
	const { x0, y0, x1, y1 } = region.frame;
	const [wx0, wz0] = toWorld([x0, y0]);
	const [wx1, wz1] = toWorld([x1, y1]);
	const sea = new THREE.Mesh(
		new THREE.PlaneGeometry(wx1 - wx0, wz1 - wz0),
		new THREE.MeshStandardMaterial({ color: SEA, roughness: 1 })
	);
	sea.rotation.x = -Math.PI / 2;
	sea.position.set((wx0 + wx1) / 2, -0.02, (wz0 + wz1) / 2);
	group.add(sea);

	const land = new THREE.MeshStandardMaterial({ color: LAND, roughness: 1 });
	const line = new THREE.LineBasicMaterial({ color: '#1b1b1b' });
	const labels = [];
	for (const n of region.neighbours) {
		const mesh = new THREE.Mesh(new THREE.ShapeGeometry(n.rings.map(shapeOf)), land);
		mesh.rotation.x = -Math.PI / 2;
		// ponytail: a hair below 0 so a sliver overlapping Nigeria's border never z-fights its cells' bottom faces
		mesh.position.y = -0.005;
		group.add(mesh);
		for (const ring of n.rings) {
			const pts = ring.map((p) => {
				const [x, z] = toWorld(p);
				return new THREE.Vector3(x, 0, z);
			});
			group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), line));
		}
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
		const [lx, lz] = toWorld(n.label);
		sprite.position.set(lx, 0.3, lz);
		group.add(sprite);
		labels.push({ id: n.id, sprite, text: '' });
	}

	const water = new THREE.MeshBasicMaterial({ color: WATER, side: THREE.DoubleSide });
	for (const r of region.rivers) for (const l of r.lines) group.add(new THREE.Mesh(ribbon(l), water));
	for (const lake of region.lakes) {
		const mesh = new THREE.Mesh(new THREE.ShapeGeometry(lake.rings.map(shapeOf)), water);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = groundAt(lake.rings[0][0]) - 0.004;
		group.add(mesh);
	}
	scene.add(group);

	return {
		/** Relabel the neighbours with the names they had in `year` (only redraws on a change). */
		setYear(year) {
			for (const l of labels) {
				const text = (neighbourName(l.id, year) ?? '').toUpperCase();
				if (text === l.text) continue;
				l.text = text;
				l.sprite.material.map?.dispose();
				const map = labelTexture(text);
				l.sprite.material.map = map;
				l.sprite.material.needsUpdate = true;
				const h = 0.8;
				l.sprite.scale.set((h * map.image.width) / map.image.height, h, 1);
			}
		},
		dispose() {
			group.traverse((o) => {
				o.geometry?.dispose();
				o.material?.map?.dispose();
				o.material?.dispose();
			});
			scene.remove(group);
		}
	};
}
