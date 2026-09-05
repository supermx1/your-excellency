// @ts-nocheck
import * as THREE from 'three';
import { TILE_SIZE } from './TerrainMeshBuilder.js';

/**
 * Traffic system that animates miniature low-poly Nigerian vehicles
 * (Yellow Danfo buses, Green Keke tricycles, and passenger cars)
 * cruising along completed road networks.
 */
export class TrafficSystem {
	/**
	 * @param {THREE.Scene} scene
	 * @param {object} grid
	 */
	constructor(scene, grid) {
		this.scene = scene;
		this.grid = grid;
		this.size = grid.size;
		this.vehicles = [];
		this.disposables = [];
		this.enabled = true;

		this.rebuildRoadNetwork();
	}

	rebuildRoadNetwork() {
		// Clean up existing vehicles
		this.clearVehicles();

		// Find all completed road tiles
		const roadTiles = this.grid.tiles.filter(
			(tile) => tile.buildingId === 'road' && (tile.turnsLeft ?? 0) === 0
		);

		if (roadTiles.length < 2) return;

		// Build graph of connected roads
		const roadMap = new Map();
		roadTiles.forEach((tile) => roadMap.set(`${tile.x},${tile.y}`, tile));

		const neighbors = (tile) => {
			const dirs = [
				{ dx: 0, dy: -1 },
				{ dx: 0, dy: 1 },
				{ dx: -1, dy: 0 },
				{ dx: 1, dy: 0 }
			];
			const list = [];
			dirs.forEach(({ dx, dy }) => {
				const n = roadMap.get(`${tile.x + dx},${tile.y + dy}`);
				if (n) list.push(n);
			});
			return list;
		};

		// Decide vehicle count based on road density (max 8)
		const vehicleCount = Math.min(8, Math.max(2, Math.floor(roadTiles.length / 2)));

		for (let i = 0; i < vehicleCount; i++) {
			const startTile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
			const vehicleType = i % 3 === 0 ? 'danfo' : i % 3 === 1 ? 'keke' : 'car';
			const vehicleMesh = this.createVehicleMesh(vehicleType);

			const worldPos = this.tileToWorld(startTile.x, startTile.y);
			vehicleMesh.position.set(worldPos.x, 0.16, worldPos.z);
			this.scene.add(vehicleMesh);

			this.vehicles.push({
				mesh: vehicleMesh,
				type: vehicleType,
				currentTile: startTile,
				targetTile: null,
				progress: 1, // Ready to pick next target
				speed: 1.2 + Math.random() * 0.8,
				waitTimer: 0
			});
		}
	}

	tileToWorld(tx, ty) {
		return {
			x: (tx - (this.size - 1) / 2) * TILE_SIZE,
			z: (ty - (this.size - 1) / 2) * TILE_SIZE
		};
	}

	createVehicleMesh(type) {
		const group = new THREE.Group();

		if (type === 'danfo') {
			// Yellow Volkswagen T3 / LT Danfo Bus
			const bodyMat = new THREE.MeshStandardMaterial({
				color: 0xfacc15,
				roughness: 0.5,
				flatShading: true
			});
			const stripeMat = new THREE.MeshStandardMaterial({
				color: 0x1e293b,
				roughness: 0.5,
				flatShading: true
			});
			const glassMat = new THREE.MeshStandardMaterial({
				color: 0x38bdf8,
				roughness: 0.2,
				flatShading: true
			});
			this.disposables.push(bodyMat, stripeMat, glassMat);

			// Bus body
			const bodyGeo = new THREE.BoxGeometry(0.24, 0.16, 0.44);
			const body = new THREE.Mesh(bodyGeo, bodyMat);
			body.position.y = 0.1;
			body.castShadow = true;
			group.add(body);

			// Iconic black stripe
			const stripeGeo = new THREE.BoxGeometry(0.25, 0.03, 0.42);
			const stripe = new THREE.Mesh(stripeGeo, stripeMat);
			stripe.position.y = 0.1;
			group.add(stripe);

			// Windshield
			const glassGeo = new THREE.BoxGeometry(0.22, 0.08, 0.05);
			const glass = new THREE.Mesh(glassGeo, glassMat);
			glass.position.set(0, 0.13, 0.21);
			group.add(glass);
		} else if (type === 'keke') {
			// Green Keke Napep (Tricycle)
			const kekeMat = new THREE.MeshStandardMaterial({
				color: 0x16a34a,
				roughness: 0.5,
				flatShading: true
			});
			const roofMat = new THREE.MeshStandardMaterial({
				color: 0xfacc15,
				roughness: 0.6,
				flatShading: true
			});
			this.disposables.push(kekeMat, roofMat);

			// Lower cabin
			const cabinGeo = new THREE.BoxGeometry(0.18, 0.1, 0.24);
			const cabin = new THREE.Mesh(cabinGeo, kekeMat);
			cabin.position.y = 0.06;
			cabin.castShadow = true;
			group.add(cabin);

			// Canopy roof
			const roofGeo = new THREE.BoxGeometry(0.2, 0.06, 0.26);
			const roof = new THREE.Mesh(roofGeo, roofMat);
			roof.position.y = 0.14;
			group.add(roof);
		} else {
			// Passenger saloon car (Red / Blue / White)
			const carColors = [0xdc2626, 0x2563eb, 0xffffff];
			const color = carColors[Math.floor(Math.random() * carColors.length)];
			const carMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, flatShading: true });
			const glassMat = new THREE.MeshStandardMaterial({
				color: 0x38bdf8,
				roughness: 0.2,
				flatShading: true
			});
			this.disposables.push(carMat, glassMat);

			// Chassis
			const chassisGeo = new THREE.BoxGeometry(0.22, 0.09, 0.38);
			const chassis = new THREE.Mesh(chassisGeo, carMat);
			chassis.position.y = 0.06;
			chassis.castShadow = true;
			group.add(chassis);

			// Cabin
			const cabinGeo = new THREE.BoxGeometry(0.18, 0.07, 0.2);
			const cabin = new THREE.Mesh(cabinGeo, glassMat);
			cabin.position.set(0, 0.13, -0.02);
			group.add(cabin);
		}

		return group;
	}

	update(delta) {
		if (!this.enabled || this.vehicles.length === 0) return;

		const roadMap = new Map();
		this.grid.tiles
			.filter((t) => t.buildingId === 'road' && (t.turnsLeft ?? 0) === 0)
			.forEach((t) => roadMap.set(`${t.x},${t.y}`, t));

		this.vehicles.forEach((v) => {
			if (v.waitTimer > 0) {
				v.waitTimer -= delta;
				return;
			}

			if (v.progress >= 1 || !v.targetTile) {
				// Pick next adjacent road tile
				const current = v.currentTile;
				const dirs = [
					{ dx: 0, dy: -1 },
					{ dx: 0, dy: 1 },
					{ dx: -1, dy: 0 },
					{ dx: 1, dy: 0 }
				];
				const candidates = [];
				dirs.forEach(({ dx, dy }) => {
					const next = roadMap.get(`${current.x + dx},${current.y + dy}`);
					if (next) candidates.push(next);
				});

				if (candidates.length === 0) {
					// Road got severed, pick any random road
					const allRoads = Array.from(roadMap.values());
					if (allRoads.length > 0) {
						v.currentTile = allRoads[Math.floor(Math.random() * allRoads.length)];
						const p = this.tileToWorld(v.currentTile.x, v.currentTile.y);
						v.mesh.position.set(p.x, 0.16, p.z);
					}
					return;
				}

				// Pick random adjacent road tile (prefer not to reverse immediately if possible)
				v.targetTile = candidates[Math.floor(Math.random() * candidates.length)];
				v.progress = 0;
			}

			// Lerp position from currentTile to targetTile
			v.progress += (v.speed / TILE_SIZE) * delta;
			const pFrom = this.tileToWorld(v.currentTile.x, v.currentTile.y);
			const pTo = this.tileToWorld(v.targetTile.x, v.targetTile.y);

			const currentX = THREE.MathUtils.lerp(pFrom.x, pTo.x, Math.min(1, v.progress));
			const currentZ = THREE.MathUtils.lerp(pFrom.z, pTo.z, Math.min(1, v.progress));
			v.mesh.position.set(currentX, 0.16, currentZ);

			// Rotate toward heading
			const dx = pTo.x - pFrom.x;
			const dz = pTo.z - pFrom.z;
			if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
				const targetAngle = Math.atan2(dx, dz);
				v.mesh.rotation.y = targetAngle;
			}

			if (v.progress >= 1) {
				v.currentTile = v.targetTile;
				v.targetTile = null;
				// 20% chance to pause at intersection
				if (Math.random() < 0.2) {
					v.waitTimer = 0.5 + Math.random() * 0.8;
				}
			}
		});
	}

	clearVehicles() {
		this.vehicles.forEach((v) => this.scene.remove(v.mesh));
		this.vehicles = [];
	}

	dispose() {
		this.clearVehicles();
		this.disposables.forEach((item) => {
			if (item?.dispose) item.dispose();
		});
	}
}
