// @ts-nocheck
// The stylised Earth for the opening and closing shots. Drawn from (renderer, globeCam) alone, like the
// diorama, so live view and video export match. Country outlines are painted onto a canvas texture once.
import * as THREE from 'three';
import { world, westAfrica } from '$lib/game/sim/data/index.js';
import { rng, hashString } from '$lib/game/engine.js';

const RAD = Math.PI / 180;

/** Longitude/latitude (degrees) → a point on a sphere of radius r: (0,0) is +z, (90,0) is +x, north is +y. */
export function lonLatToVec3(lon, lat, r) {
	const c = Math.cos(lat * RAD);
	return [r * c * Math.sin(lon * RAD), r * Math.sin(lat * RAD), r * c * Math.cos(lon * RAD)];
}

const WORLD_BOX = { lon0: -180, lon1: 180, lat0: -90, lat1: 90 };

/** Equirectangular painting of `countries` (and optional rivers/lakes) for the lon/lat box onto a w×h canvas. */
function paint(w, h, box, countries, water = null) {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	const at = ([lon, lat]) => [((lon - box.lon0) / (box.lon1 - box.lon0)) * w, ((box.lat1 - lat) / (box.lat1 - box.lat0)) * h];
	const trace = (line, close) => {
		line.forEach((p, i) => (i ? ctx.lineTo(...at(p)) : ctx.moveTo(...at(p))));
		if (close) ctx.closePath();
	};
	// Border width in degrees, so the world texture and the close-up patch draw borders alike on screen.
	const degree = w / (box.lon1 - box.lon0);
	ctx.fillStyle = '#0f2236';
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = '#1b1b1b';
	ctx.lineJoin = 'round';
	ctx.lineWidth = Math.max(1, degree * (water ? 0.1 : 0.26));
	for (const country of countries) {
		ctx.beginPath();
		for (const ring of country.rings) trace(ring, true);
		ctx.fillStyle = country.id === 'NGA' ? '#f5c542' : '#3a4a3f';
		ctx.fill('evenodd');
		ctx.stroke();
	}
	if (water) {
		ctx.fillStyle = ctx.strokeStyle = '#3d7fc4';
		for (const lake of water.lakes) {
			ctx.beginPath();
			for (const ring of lake.rings) trace(ring, true);
			ctx.fill('evenodd');
		}
		ctx.lineWidth = Math.max(1, degree * 0.08);
		for (const river of water.rivers)
			for (const line of river.lines) {
				ctx.beginPath();
				trace(line, false);
				ctx.stroke();
			}
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/** A sphere section covering a lon/lat box (SphereGeometry's phi = lon + 90°, theta = 90° − lat in our frame). */
function patchGeometry(box, r, segments) {
	return new THREE.SphereGeometry(
		r,
		segments,
		segments,
		(box.lon0 + 90) * RAD,
		(box.lon1 - box.lon0) * RAD,
		(90 - box.lat1) * RAD,
		(box.lat1 - box.lat0) * RAD
	);
}

function worldTexture(w, h) {
	const tex = paint(w, h, WORLD_BOX, world);
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

	const map = worldTexture(lowDetail ? 1024 : 2048, lowDetail ? 512 : 1024);
	const earth = new THREE.Mesh(
		new THREE.SphereGeometry(1, lowDetail ? 32 : 64, lowDetail ? 24 : 48),
		new THREE.MeshBasicMaterial({ map })
	);
	scene.add(earth);
	// The close-up: West Africa at ~1.4 km a pixel (~2.8 km on phones), just above the world texture.
	const box = westAfrica.box;
	const detail = paint(lowDetail ? 1536 : 3072, lowDetail ? 1152 : 2304, box, westAfrica.countries, westAfrica);
	earth.add(new THREE.Mesh(patchGeometry(box, 1.0006, lowDetail ? 24 : 48), new THREE.MeshBasicMaterial({ map: detail })));
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
			// Narrow screens back off, like the diorama's width fit, so Nigeria is the same share of the width
			// when the globe hands over (1.436 is the aspect where the diorama's width fit starts to bite).
			const back = Math.max(1, 1.436 / camera.aspect);
			camera.position.set(...lonLatToVec3(lon, lat, 1 + (distance - 1) * back));
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
			detail.dispose();
		}
	};
}
