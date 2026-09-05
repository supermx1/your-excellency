// @ts-nocheck
import * as THREE from 'three';
import { TILE_SIZE } from './TerrainMeshBuilder.js';

/**
 * Manages lighting, sky, clouds, birds, trees, and environmental ambiance.
 */
export class EnvironmentManager {
	/**
	 * @param {THREE.Scene} scene
	 * @param {object} grid
	 */
	constructor(scene, grid) {
		this.scene = scene;
		this.grid = grid;
		this.size = grid.size;
		this.boardHalf = (this.size * TILE_SIZE) / 2;

		this.clouds = [];
		this.birds = [];
		this.trees = [];
		this.dustPuffs = [];
		this.disposables = [];

		this.setupLighting();
		this.setupClouds();
		this.setupBirds();
		this.setupFoliage();
	}

	setupLighting() {
		// 1. Hemisphere Light: Tropical sky and warm African earth bounce
		this.hemiLight = new THREE.HemisphereLight(0xfff7ed, 0xb45309, 0.75);
		this.scene.add(this.hemiLight);

		// 2. Main Directional Sun Light
		this.sunLight = new THREE.DirectionalLight(0xffedd5, 1.4);
		this.sunLight.position.set(this.boardHalf * 1.5, 24, this.boardHalf * 1.2);
		this.sunLight.castShadow = true;

		// Shadow map camera settings for crisp coverage
		const d = this.boardHalf * 1.4;
		this.sunLight.shadow.camera.left = -d;
		this.sunLight.shadow.camera.right = d;
		this.sunLight.shadow.camera.top = d;
		this.sunLight.shadow.camera.bottom = -d;
		this.sunLight.shadow.camera.near = 1;
		this.sunLight.shadow.camera.far = 80;
		this.sunLight.shadow.mapSize.width = 2048;
		this.sunLight.shadow.mapSize.height = 2048;
		this.sunLight.shadow.bias = -0.0004;

		this.scene.add(this.sunLight);

		// 3. Subtle Fill Light to soften harsh contrast
		this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
		this.fillLight.position.set(-this.boardHalf, 15, -this.boardHalf);
		this.scene.add(this.fillLight);
	}

	setLightingMode(mode) {
		if (mode === 'golden') {
			// Golden Hour / Sunset
			this.hemiLight.color.setHex(0xfed7aa);
			this.hemiLight.groundColor.setHex(0x9a3412);
			this.hemiLight.intensity = 0.65;

			this.sunLight.color.setHex(0xf97316);
			this.sunLight.intensity = 1.6;
			this.sunLight.position.set(this.boardHalf * 1.8, 12, this.boardHalf * 0.8);

			this.fillLight.color.setHex(0xc084fc);
			this.fillLight.intensity = 0.45;
		} else if (mode === 'night') {
			// Moonlit Night
			this.hemiLight.color.setHex(0x38bdf8);
			this.hemiLight.groundColor.setHex(0x0f172a);
			this.hemiLight.intensity = 0.25;

			this.sunLight.color.setHex(0x93c5fd);
			this.sunLight.intensity = 0.5;
			this.sunLight.position.set(-this.boardHalf, 20, this.boardHalf);

			this.fillLight.color.setHex(0x1e1b4b);
			this.fillLight.intensity = 0.2;
		} else {
			// Bright Nigerian Sun (Day)
			this.hemiLight.color.setHex(0xfff7ed);
			this.hemiLight.groundColor.setHex(0xb45309);
			this.hemiLight.intensity = 0.75;

			this.sunLight.color.setHex(0xffedd5);
			this.sunLight.intensity = 1.4;
			this.sunLight.position.set(this.boardHalf * 1.5, 24, this.boardHalf * 1.2);

			this.fillLight.color.setHex(0x93c5fd);
			this.fillLight.intensity = 0.35;
		}
	}

	setupClouds() {
		// Create 8 low-poly stylized clouds drifting at altitude 8 to 14
		const cloudMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.9,
			metalness: 0.0,
			flatShading: true,
			transparent: true,
			opacity: 0.92
		});
		this.disposables.push(cloudMat);

		const numClouds = 8;
		const range = this.boardHalf * 2.2;

		for (let i = 0; i < numClouds; i++) {
			const cloudGroup = new THREE.Group();
			const puffs = 4 + Math.floor(Math.random() * 4);

			for (let p = 0; p < puffs; p++) {
				const r = 0.8 + Math.random() * 0.9;
				const geo = new THREE.DodecahedronGeometry(r, 1);
				this.disposables.push(geo);
				const mesh = new THREE.Mesh(geo, cloudMat);
				mesh.position.set(
					(p - puffs / 2) * 1.1 + (Math.random() - 0.5) * 0.5,
					(Math.random() - 0.5) * 0.4,
					(Math.random() - 0.5) * 1.2
				);
				mesh.scale.set(1.2, 0.7, 1);
				mesh.castShadow = true;
				cloudGroup.add(mesh);
			}

			cloudGroup.position.set(
				(Math.random() - 0.5) * range,
				9 + Math.random() * 4.5,
				(Math.random() - 0.5) * range
			);

			const speed = 0.6 + Math.random() * 0.7;
			this.clouds.push({ group: cloudGroup, speed, range });
			this.scene.add(cloudGroup);
		}
	}

	setupBirds() {
		// Flock of 6 white egrets circling overhead
		const birdMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.4,
			flatShading: true
		});
		this.disposables.push(birdMat);

		const numBirds = 6;
		for (let i = 0; i < numBirds; i++) {
			const bird = new THREE.Group();

			// Body
			const bodyGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
			bodyGeo.rotateX(Math.PI / 2);
			this.disposables.push(bodyGeo);
			const body = new THREE.Mesh(bodyGeo, birdMat);
			bird.add(body);

			// Left Wing
			const wingGeo = new THREE.BoxGeometry(0.32, 0.02, 0.12);
			this.disposables.push(wingGeo);
			const leftWing = new THREE.Mesh(wingGeo, birdMat);
			leftWing.position.set(-0.2, 0.02, 0);
			bird.add(leftWing);

			// Right Wing
			const rightWing = new THREE.Mesh(wingGeo, birdMat);
			rightWing.position.set(0.2, 0.02, 0);
			bird.add(rightWing);

			bird.position.set(0, 11 + (i % 3) * 0.8, 0);
			this.birds.push({
				group: bird,
				leftWing,
				rightWing,
				angle: (i / numBirds) * Math.PI * 2,
				radius: this.boardHalf * 0.55 + (i % 3) * 1.2,
				speed: 0.7 + (i % 2) * 0.2,
				flapSpeed: 12 + i * 2
			});
			this.scene.add(bird);
		}
	}

	setupFoliage() {
		// Place stylized Palm Trees & Acacia trees on unoccupied scrub and farmland tiles
		const palmTrunkMat = new THREE.MeshStandardMaterial({
			color: 0x78350f,
			roughness: 0.9,
			flatShading: true
		});
		const palmFrondMat = new THREE.MeshStandardMaterial({
			color: 0x15803d,
			roughness: 0.6,
			flatShading: true
		});
		const acaciaMat = new THREE.MeshStandardMaterial({
			color: 0x4d7c0f,
			roughness: 0.7,
			flatShading: true
		});
		this.disposables.push(palmTrunkMat, palmFrondMat, acaciaMat);

		this.grid.tiles.forEach((tile) => {
			if (tile.buildingId) return;

			// Deterministic pseudo-random placement based on coordinates
			const hash = Math.sin(tile.x * 12.9898 + tile.y * 78.233) * 43758.5453;
			const r = hash - Math.floor(hash);

			const isPalmEligible = (tile.type === 'riverside' || tile.type === 'residential') && r > 0.65;
			const isAcaciaEligible = (tile.type === 'scrub' || tile.type === 'farmland') && r > 0.6;

			if (!isPalmEligible && !isAcaciaEligible) return;

			const wx = (tile.x - (this.size - 1) / 2) * TILE_SIZE;
			const wz = (tile.y - (this.size - 1) / 2) * TILE_SIZE;

			const offsetX = (r - 0.5) * 0.7 * TILE_SIZE;
			const offsetZ = (((r * 3.7) % 1) - 0.5) * 0.7 * TILE_SIZE;

			if (isPalmEligible) {
				const tree = new THREE.Group();
				const trunkH = 0.8 + r * 0.5;

				// Trunk
				const trunkGeo = new THREE.CylinderGeometry(0.04, 0.08, trunkH, 6);
				this.disposables.push(trunkGeo);
				const trunk = new THREE.Mesh(trunkGeo, palmTrunkMat);
				trunk.position.y = trunkH / 2 + 0.12;
				trunk.castShadow = true;
				tree.add(trunk);

				// Palm Fronds (Arching top foliage)
				for (let f = 0; f < 6; f++) {
					const frondGeo = new THREE.ConeGeometry(0.24, 0.5, 4);
					this.disposables.push(frondGeo);
					const frond = new THREE.Mesh(frondGeo, palmFrondMat);
					frond.rotation.z = 1.1;
					frond.rotation.y = (f / 6) * Math.PI * 2;
					frond.position.y = trunkH + 0.12;
					frond.castShadow = true;
					tree.add(frond);
				}

				tree.position.set(wx + offsetX, 0, wz + offsetZ);
				this.trees.push(tree);
				this.scene.add(tree);
			} else if (isAcaciaEligible) {
				// Savannah Umbrella Acacia Tree
				const tree = new THREE.Group();
				const trunkH = 0.6 + r * 0.4;

				const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, trunkH, 6);
				this.disposables.push(trunkGeo);
				const trunk = new THREE.Mesh(trunkGeo, palmTrunkMat);
				trunk.position.y = trunkH / 2 + 0.12;
				trunk.castShadow = true;
				tree.add(trunk);

				// Flat umbrella canopy
				const canopyGeo = new THREE.CylinderGeometry(0.45, 0.35, 0.18, 7);
				this.disposables.push(canopyGeo);
				const canopy = new THREE.Mesh(canopyGeo, acaciaMat);
				canopy.position.y = trunkH + 0.18;
				canopy.castShadow = true;
				tree.add(canopy);

				tree.position.set(wx + offsetX, 0, wz + offsetZ);
				this.trees.push(tree);
				this.scene.add(tree);
			}
		});
	}

	spawnDustPuff(worldX, worldZ) {
		const dustGroup = new THREE.Group();
		const dustMat = new THREE.MeshStandardMaterial({
			color: 0xfef08a,
			transparent: true,
			opacity: 0.8,
			flatShading: true
		});
		this.disposables.push(dustMat);

		for (let i = 0; i < 6; i++) {
			const geo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.12, 0);
			this.disposables.push(geo);
			const mesh = new THREE.Mesh(geo, dustMat);
			mesh.position.set(
				(Math.random() - 0.5) * 0.6,
				0.2 + Math.random() * 0.3,
				(Math.random() - 0.5) * 0.6
			);
			dustGroup.add(mesh);
		}

		dustGroup.position.set(worldX, 0, worldZ);
		this.scene.add(dustGroup);
		this.dustPuffs.push({ group: dustGroup, age: 0, maxAge: 1.2 });
	}

	update(delta, time) {
		// 1. Drift Clouds
		this.clouds.forEach(({ group, speed, range }) => {
			group.position.x += speed * delta;
			if (group.position.x > range) {
				group.position.x = -range;
			}
		});

		// 2. Circling Birds & Wing Flapping
		this.birds.forEach((bird) => {
			bird.angle += bird.speed * delta * 0.6;
			bird.group.position.x = Math.cos(bird.angle) * bird.radius;
			bird.group.position.z = Math.sin(bird.angle) * bird.radius;
			bird.group.rotation.y = -bird.angle + Math.PI / 2;

			// Wing flap
			const flap = Math.sin(time * bird.flapSpeed) * 0.45;
			bird.leftWing.rotation.z = flap;
			bird.rightWing.rotation.z = -flap;
		});

		// 3. Gentle Tree Wind Sway
		const sway = Math.sin(time * 1.8) * 0.04;
		this.trees.forEach((tree, idx) => {
			tree.rotation.z = sway * (idx % 2 === 0 ? 1 : -1);
		});

		// 4. Update Dust Puffs
		for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
			const puff = this.dustPuffs[i];
			puff.age += delta;
			const progress = puff.age / puff.maxAge;
			puff.group.position.y += delta * 0.5;
			puff.group.scale.multiplyScalar(1 + delta * 0.5);

			puff.group.children.forEach((child) => {
				if (child.material) child.material.opacity = Math.max(0, 0.8 * (1 - progress));
			});

			if (puff.age >= puff.maxAge) {
				this.scene.remove(puff.group);
				this.dustPuffs.splice(i, 1);
			}
		}
	}

	dispose() {
		this.clouds.forEach((c) => this.scene.remove(c.group));
		this.birds.forEach((b) => this.scene.remove(b.group));
		this.trees.forEach((t) => this.scene.remove(t));
		this.dustPuffs.forEach((p) => this.scene.remove(p.group));

		this.disposables.forEach((item) => {
			if (item?.dispose) item.dispose();
		});
	}
}
