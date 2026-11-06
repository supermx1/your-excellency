// @ts-nocheck
// Nigeria's neighbours and the sea, drawn flat and dimmed around the diorama.
import * as THREE from 'three';
import { toWorld } from './geometry.js';
import { region } from '$lib/game/sim/data/index.js';

const SEA = new THREE.Color('#0f2236');
const LAND = SEA.clone().lerp(new THREE.Color('#3a4a3f'), 0.6);
const shapeOf = (ring) => new THREE.Shape(ring.map((p) => {
	const [x, z] = toWorld(p);
	return new THREE.Vector2(x, -z);
}));

function label(text) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const font = '600 44px system-ui, sans-serif';
	ctx.font = font;
	canvas.width = Math.ceil(ctx.measureText(text).width) + 16;
	canvas.height = 64;
	ctx.font = font;
	ctx.fillStyle = 'rgba(255,255,255,0.5)';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, 8, 32);
	const map = new THREE.CanvasTexture(canvas);
	const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
	const h = 0.8;
	sprite.scale.set((h * canvas.width) / canvas.height, h, 1);
	return sprite;
}

/** Adds the sea plane, neighbour shapes, outlines and labels to `scene`. @returns {() => void} dispose */
export function addNeighbours(scene) {
	const group = new THREE.Group();
	const { x0, y0, x1, y1 } = region.frame;
	const [wx0, wz0] = toWorld([x0, y0]);
	const [wx1, wz1] = toWorld([x1, y1]);
	const sea = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wz1 - wz0), new THREE.MeshStandardMaterial({ color: SEA, roughness: 1 }));
	sea.rotation.x = -Math.PI / 2;
	sea.position.set((wx0 + wx1) / 2, -0.02, (wz0 + wz1) / 2);
	group.add(sea);

	const land = new THREE.MeshStandardMaterial({ color: LAND, roughness: 1 });
	const line = new THREE.LineBasicMaterial({ color: '#1b1b1b' });
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
		const sprite = label(n.name.toUpperCase());
		const [lx, lz] = toWorld(n.label);
		sprite.position.set(lx, 0.3, lz);
		group.add(sprite);
	}
	scene.add(group);
	return () => {
		group.traverse((o) => {
			o.geometry?.dispose();
			o.material?.map?.dispose();
			o.material?.dispose();
		});
		scene.remove(group);
	};
}
