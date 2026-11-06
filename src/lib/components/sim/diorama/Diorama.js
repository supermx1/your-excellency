// @ts-nocheck
// The 3D diorama. draw(frame, camera) renders one picture from (frame, camera) alone — no internal
// clock — so live mode and video export produce the same image for the same time.
import * as THREE from 'three';
import { cellShapes, sharedEdges, toWorld } from './geometry.js';
import { addNeighbours } from './neighbours.js';
import { createGlobe } from './globe.js';
import { polityColor } from '$lib/game/sim/colors.js';
import cells from '$lib/game/sim/data/cells.json';

const DEPTH = 0.25;
const TILT = (52 * Math.PI) / 180;
const SICK = new THREE.Color('#9acd32');
const RED = new THREE.Color('#ff3b1f');

export class Diorama {
	/** @param {HTMLCanvasElement} canvas @param {{ lowDetail?: boolean }} [opts] */
	constructor(canvas, { lowDetail = false } = {}) {
		this.lowDetail = lowDetail;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowDetail, preserveDrawingBuffer: true });
		this.renderer.setPixelRatio(lowDetail ? 1 : Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = !lowDetail;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#0e1116');
		this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 200);

		this.scene.add(new THREE.HemisphereLight('#fff6e0', '#1b2a22', 1.2));
		const sun = new THREE.DirectionalLight('#ffffff', 1.6);
		sun.position.set(-8, 14, 6);
		sun.castShadow = !lowDetail;
		sun.shadow.mapSize.set(1024, 1024);
		Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
		this.scene.add(sun);
		this.sun = sun;
		this.disposeNeighbours = addNeighbours(this.scene);

		this.cells = new Map();
		const segments = lowDetail ? 6 : 12;
		for (const c of cells) {
			const geom = new THREE.ExtrudeGeometry(cellShapes().get(c.id), { depth: DEPTH, bevelEnabled: false, curveSegments: 1 });
			const mat = new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.85, emissive: '#000' });
			const mesh = new THREE.Mesh(geom, mat);
			mesh.rotation.x = -Math.PI / 2;
			mesh.receiveShadow = !lowDetail;
			this.scene.add(mesh);

			const [x, z] = toWorld(c.centroid);
			const tower = new THREE.Mesh(
				new THREE.CylinderGeometry(0.09, 0.12, 1, segments),
				new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#f5c542', emissiveIntensity: 0.9 })
			);
			tower.position.set(x, DEPTH, z);
			tower.castShadow = !lowDetail;
			this.scene.add(tower);
			this.cells.set(c.id, { mesh, tower, color: new THREE.Color() });
		}

		this.borders = new THREE.LineSegments(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: '#111', linewidth: 2 })
		);
		this.borders.position.y = DEPTH + 0.01;
		this.scene.add(this.borders);
		this.borderKey = '';

		// A black quad over the whole picture for the dip between globe and diorama.
		this.dipCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.dipQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, depthTest: false }));
		this.dipScene = new THREE.Scene();
		this.dipScene.add(this.dipQuad);
	}

	/**
	 * @param {ReturnType<import('$lib/game/sim/frame.js').frameAt>} frame
	 * @param {{ mode?: 'globe' | 'diorama', globe?: object, target?: number[], zoom?: number, dip?: number }} camera
	 */
	draw(frame, camera) {
		this.last = [frame, camera];
		if (camera.mode === 'globe') {
			// Created on first use: split-screen dioramas never show the globe.
			if (!this.globe) {
				this.globe = createGlobe({ lowDetail: this.lowDetail });
				this.globe.resize(this.camera.aspect, 1);
			}
			this.globe.draw(this.renderer, camera.globe);
		} else this.drawDiorama(frame, camera);
		if (camera.dip > 0) {
			this.dipQuad.material.opacity = Math.min(1, camera.dip);
			this.renderer.autoClear = false;
			this.renderer.render(this.dipScene, this.dipCamera);
			this.renderer.autoClear = true;
		}
	}

	drawDiorama(frame, camera) {
		const pulse = 0.4 + 0.4 * Math.sin(2 * Math.PI * frame.t * 2);
		for (const c of frame.cells) {
			const view = this.cells.get(c.id);
			if (!view) continue;
			const from = new THREE.Color(polityColor(c.polityId));
			view.color.copy(from).lerp(new THREE.Color(polityColor(c.nextPolityId)), c.nextPolityId === c.polityId ? 0 : frame.t);
			if (c.epidemic) view.color.lerp(SICK, 0.55 * (1 - frame.t));
			const mat = view.mesh.material;
			mat.color.copy(view.color);
			mat.emissive.copy(c.warFront ? RED : view.color);
			mat.emissiveIntensity = c.warFront ? pulse : 0.05;
			const h = 0.2 + (4 * c.urban * c.pop) / 20e6;
			view.tower.scale.y = h;
			view.tower.position.y = DEPTH + h / 2;
		}
		this.updateBorders(frame);

		const [tx, tz] = toWorld(camera.target);
		// Far enough that the 20-unit-wide map fits the screen width, whatever the aspect ratio.
		const fitWidth = 11.5 / (Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect);
		const dist = Math.max(22, fitWidth) / camera.zoom;
		this.camera.position.set(tx, Math.sin(TILT) * dist, tz + Math.cos(TILT) * dist);
		this.camera.lookAt(tx, 0, tz);
		this.renderer.render(this.scene, this.camera);
	}

	updateBorders(frame) {
		const owner = new Map(frame.cells.map((c) => [c.id, c.polityId]));
		const key = frame.cells.map((c) => c.polityId).join(',');
		if (key === this.borderKey) return;
		this.borderKey = key;
		const pos = [];
		for (const [pair, segs] of sharedEdges()) {
			const [a, b] = pair.split('|');
			if (owner.get(a) !== owner.get(b)) pos.push(...segs);
		}
		this.borders.geometry.dispose();
		this.borders.geometry = new THREE.BufferGeometry();
		this.borders.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	}

	resize(width, height) {
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.globe?.resize(width, height);
		// Resizing clears the canvas, so draw the last picture again.
		if (this.last) this.draw(...this.last);
	}

	dispose() {
		this.disposeNeighbours();
		this.globe?.dispose();
		this.scene.traverse((o) => {
			o.geometry?.dispose();
			o.material?.dispose();
		});
		this.sun.shadow.dispose();
		this.renderer.dispose();
		// dispose() keeps the WebGL context alive; browsers cap live contexts (~16), so release it.
		this.renderer.forceContextLoss();
	}
}
