// @ts-nocheck
// The stylised Earth for the opening and closing shots. Drawn from (renderer, globeCam) alone, like the
// diorama, so live view and video export match. Country outlines are painted onto a canvas texture once.
import * as THREE from 'three';
import { world } from '$lib/game/sim/data/index.js';
import { rng, hashString } from '$lib/game/engine.js';

const RAD = Math.PI / 180;

/** Longitude/latitude (degrees) → a point on a sphere of radius r: (0,0) is +z, (90,0) is +x, north is +y. */
export function lonLatToVec3(lon, lat, r) {
	const c = Math.cos(lat * RAD);
	return [r * c * Math.sin(lon * RAD), r * Math.sin(lat * RAD), r * c * Math.cos(lon * RAD)];
}

function paint(w, h) {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#0f2236';
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = '#1b1b1b';
	ctx.lineWidth = w / 1400;
	for (const country of world) {
		ctx.beginPath();
		for (const ring of country.rings) {
			ring.forEach(([lon, lat], i) => {
				const x = ((lon + 180) / 360) * w;
				const y = ((90 - lat) / 180) * h;
				if (i) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
			});
			ctx.closePath();
		}
		ctx.fillStyle = country.id === 'NGA' ? '#f5c542' : '#3a4a3f';
		ctx.fill('evenodd');
		ctx.stroke();
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	// SphereGeometry's u = 0 sits at lon −90 in lonLatToVec3's frame; shift so the texture's lon 0 lands on +z.
	tex.wrapS = THREE.RepeatWrapping;
	tex.offset.x = 0.25;
	return tex;
}

/** @param {{ lowDetail?: boolean }} [opts] */
export function createGlobe({ lowDetail = false } = {}) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color('#05070b');
	const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 200);

	const map = paint(lowDetail ? 1024 : 2048, lowDetail ? 512 : 1024);
	const earth = new THREE.Mesh(
		new THREE.SphereGeometry(1, lowDetail ? 32 : 64, lowDetail ? 24 : 48),
		new THREE.MeshBasicMaterial({ map })
	);
	scene.add(earth);
	scene.add(new THREE.Mesh(
		new THREE.SphereGeometry(1.08, 32, 24),
		new THREE.MeshBasicMaterial({ color: '#4a8cff', transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
	));

	const next = rng(hashString('stars'));
	const n = lowDetail ? 300 : 1500;
	const pos = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const lon = next() * 360 - 180;
		const lat = Math.asin(2 * next() - 1) / RAD;
		pos.set(lonLatToVec3(lon, lat, 60), i * 3);
	}
	const starGeom = new THREE.BufferGeometry();
	starGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.5, sizeAttenuation: false })));

	return {
		scene,
		camera,
		/** @param {THREE.WebGLRenderer} renderer @param {{ lon: number, lat: number, distance: number, spin: number }} g */
		draw(renderer, { lon, lat, distance, spin }) {
			earth.rotation.y = spin * RAD;
			camera.position.set(...lonLatToVec3(lon, lat, distance));
			camera.lookAt(0, 0, 0);
			renderer.render(scene, camera);
		},
		resize(w, h) {
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		},
		dispose() {
			scene.traverse((o) => {
				o.geometry?.dispose();
				o.material?.dispose();
			});
			map.dispose();
		}
	};
}
