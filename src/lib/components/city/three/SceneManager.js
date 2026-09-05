// @ts-nocheck
import * as THREE from 'three';
import { buildTerrainDiorama, getRoadConnections, TILE_SIZE } from './TerrainMeshBuilder.js';
import { createBuildingModel } from './BuildingModels.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { TrafficSystem } from './TrafficSystem.js';
import { CameraController } from './CameraController.js';
import { InteractionManager } from './InteractionManager.js';

/**
 * Main 3D Scene Orchestrator for The Constituency.
 * Integrates WebGLRenderer, camera, terrain, models, environment, traffic, and animation loop.
 */
export class SceneManager {
	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {object} initialRun - Current CityRun state
	 * @param {object} callbacks - { onTileClick, onTileInspect, onTileHover }
	 */
	constructor(canvas, initialRun, callbacks = {}) {
		this.canvas = canvas;
		this.run = initialRun;
		this.callbacks = callbacks;

		this.clock = new THREE.Clock();
		this.animationFrameId = null;
		this.buildingMeshes = new Map(); // key: "x,y" -> THREE.Group

		this.initThree();
		this.initSceneObjects();
		this.startAnimationLoop();
	}

	initThree() {
		// 1. Renderer
		const rect = this.canvas.parentElement?.getBoundingClientRect() || {
			width: 800,
			height: 600
		};
		this.width = rect.width;
		this.height = Math.max(480, rect.height);

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			powerPreference: 'high-performance',
			alpha: false
		});
		this.renderer.setSize(this.width, this.height, false);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;

		// 2. Scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xfef3c7); // Warm amber ambient sky

		// 3. Camera
		this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.5, 200);

		// 4. Camera Controller
		const boardRadius = (this.run.grid.size * TILE_SIZE) / 2;
		this.cameraController = new CameraController(this.camera, this.canvas, boardRadius);

		// 5. Buildings Container
		this.buildingsGroup = new THREE.Group();
		this.scene.add(this.buildingsGroup);
	}

	initSceneObjects() {
		// 1. Terrain Diorama
		this.terrain = buildTerrainDiorama(this.run.grid);
		this.scene.add(this.terrain.terrainGroup);

		// 2. Environment (Sun, Sky, Clouds, Birds, Foliage)
		this.environment = new EnvironmentManager(this.scene, this.run.grid);

		// 3. Traffic System (Danfo buses, Keke napeps)
		this.traffic = new TrafficSystem(this.scene, this.run.grid);

		// 4. Interaction Manager (Raycasting, Ghost placement)
		this.interaction = new InteractionManager(
			this.camera,
			this.scene,
			this.canvas,
			this.terrain.clickableMeshes,
			{
				onTileSelect: (tile) => {
					if (this.callbacks.onTileClick) {
						this.callbacks.onTileClick(tile);
					}
				},
				onTileHover: (tile) => {
					if (this.callbacks.onTileHover) {
						this.callbacks.onTileHover(tile);
					}
				}
			}
		);
		this.interaction.setRunState(this.run, null);

		// 5. Initial Buildings Sync
		this.syncBuildings(true);
	}

	syncBuildings(initial = false) {
		const currentKeys = new Set();
		const size = this.run.grid.size;

		this.run.grid.tiles.forEach((tile) => {
			const key = `${tile.x},${tile.y}`;
			if (!tile.buildingId) {
				// If building was removed
				if (this.buildingMeshes.has(key)) {
					const oldMesh = this.buildingMeshes.get(key);
					this.buildingsGroup.remove(oldMesh);
					this.buildingMeshes.delete(key);
				}
				return;
			}

			currentKeys.add(key);
			const isUnderConstruction = (tile.turnsLeft ?? 0) > 0;
			const existing = this.buildingMeshes.get(key);

			// Check if we need to build or update model
			const needsRebuild =
				!existing ||
				existing.userData.buildingId !== tile.buildingId ||
				existing.userData.underConstruction !== isUnderConstruction;

			if (needsRebuild) {
				if (existing) {
					this.buildingsGroup.remove(existing);
				}

				const roadConnections =
					tile.buildingId === 'road' ? getRoadConnections(this.run.grid, tile.x, tile.y) : null;

				const model = createBuildingModel(tile.buildingId, isUnderConstruction, roadConnections);
				model.userData = {
					buildingId: tile.buildingId,
					underConstruction: isUnderConstruction,
					x: tile.x,
					y: tile.y
				};

				const wx = (tile.x - (size - 1) / 2) * TILE_SIZE;
				const wz = (tile.y - (size - 1) / 2) * TILE_SIZE;
				// Base elevation from terrain
				const tileMesh = this.terrain.tileMeshMap.get(key);
				const baseY = tileMesh ? tileMesh.userData.baseY + 0.08 : 0.12;

				model.position.set(wx, baseY, wz);
				this.buildingsGroup.add(model);
				this.buildingMeshes.set(key, model);

				// Spawn dust puff on placement (if not initial load)
				if (!initial && this.environment) {
					this.environment.spawnDustPuff(wx, wz);
				}
			}
		});

		// Clean up any stale meshes
		for (const [key, mesh] of this.buildingMeshes.entries()) {
			if (!currentKeys.has(key)) {
				this.buildingsGroup.remove(mesh);
				this.buildingMeshes.delete(key);
			}
		}

		// Rebuild traffic roads if road network changed
		if (this.traffic) {
			this.traffic.rebuildRoadNetwork();
		}
	}

	updateState(newRun, selectedBuildingId) {
		this.run = newRun;
		this.interaction.setRunState(this.run, selectedBuildingId);
		this.syncBuildings(false);
	}

	startAnimationLoop() {
		const loop = () => {
			const delta = Math.min(this.clock.getDelta(), 0.1);
			const time = this.clock.getElapsedTime();

			// Update subsystems
			if (this.cameraController) this.cameraController.update();
			if (this.terrain) this.terrain.update(time);
			if (this.environment) this.environment.update(delta, time);
			if (this.traffic) this.traffic.update(delta);

			// Render frame
			this.renderer.render(this.scene, this.camera);
			this.animationFrameId = requestAnimationFrame(loop);
		};

		this.animationFrameId = requestAnimationFrame(loop);
	}

	resize(width, height) {
		this.width = width;
		this.height = height;
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height, false);
	}

	focusTile(x, y) {
		const size = this.run.grid.size;
		const wx = (x - (size - 1) / 2) * TILE_SIZE;
		const wz = (y - (size - 1) / 2) * TILE_SIZE;
		this.cameraController.focusOnTile(wx, wz);
	}

	dispose() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}

		this.cameraController?.dispose();
		this.interaction?.dispose();
		this.environment?.dispose();
		this.traffic?.dispose();
		this.terrain?.dispose();

		this.renderer?.dispose();
	}
}
