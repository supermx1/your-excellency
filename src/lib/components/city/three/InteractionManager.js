// @ts-nocheck
import * as THREE from 'three';
import { createGhostModel } from './BuildingModels.js';
import { TILE_SIZE } from './TerrainMeshBuilder.js';
import { previewPlacement } from '$lib/game/city/engine.js';

/**
 * Handles pointer raycasting, tile hover states, 3D ghost placement preview,
 * and click interactions for The Constituency.
 */
export class InteractionManager {
	/**
	 * @param {THREE.Camera} camera
	 * @param {THREE.Scene} scene
	 * @param {HTMLElement} domElement
	 * @param {THREE.Mesh[]} clickableMeshes
	 * @param {object} callbacks - { onTileSelect, onTileHover }
	 */
	constructor(camera, scene, domElement, clickableMeshes, callbacks = {}) {
		this.camera = camera;
		this.scene = scene;
		this.domElement = domElement;
		this.clickableMeshes = clickableMeshes;
		this.callbacks = callbacks;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2(-999, -999);
		this.pointerDownPos = { x: 0, y: 0 };

		this.run = null;
		this.selectedBuildingId = null;
		this.hoveredTile = null;

		// 3D Visual Feedback Elements
		this.ghostGroup = new THREE.Group();
		this.scene.add(this.ghostGroup);
		this.currentGhostId = null;

		// Hover selection ring/box
		this.hoverIndicator = this.createHoverIndicator();
		this.scene.add(this.hoverIndicator);

		this.bindEvents();
	}

	setRunState(run, selectedBuildingId) {
		this.run = run;
		const buildingChanged = this.selectedBuildingId !== selectedBuildingId;
		this.selectedBuildingId = selectedBuildingId;

		if (buildingChanged) {
			this.updateGhostModel();
		}
	}

	createHoverIndicator() {
		const group = new THREE.Group();
		const margin = 0.05;
		const w = TILE_SIZE - margin;
		// Neo-brutalist thick black outline frame with yellow corners
		const frameGeo = new THREE.BoxGeometry(w, 0.06, w);
		const frameMat = new THREE.MeshBasicMaterial({
			color: 0xfacc15,
			wireframe: true
		});
		const mesh = new THREE.Mesh(frameGeo, frameMat);
		group.add(mesh);
		group.visible = false;
		return group;
	}

	bindEvents() {
		this.onPointerMove = this.handlePointerMove.bind(this);
		this.onPointerDown = this.handlePointerDown.bind(this);
		this.onPointerUp = this.handlePointerUp.bind(this);
		this.onPointerLeave = this.handlePointerLeave.bind(this);

		this.domElement.addEventListener('pointermove', this.onPointerMove);
		this.domElement.addEventListener('pointerdown', this.onPointerDown);
		this.domElement.addEventListener('pointerup', this.onPointerUp);
		this.domElement.addEventListener('pointerleave', this.onPointerLeave);
	}

	getNormalizedCoords(e) {
		const rect = this.domElement.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
			y: -((e.clientY - rect.top) / rect.height) * 2 + 1
		};
	}

	handlePointerDown(e) {
		this.pointerDownPos = { x: e.clientX, y: e.clientY };
	}

	handlePointerMove(e) {
		const { x, y } = this.getNormalizedCoords(e);
		this.mouse.set(x, y);

		this.raycaster.setFromCamera(this.mouse, this.camera);
		const intersects = this.raycaster.intersectObjects(this.clickableMeshes, false);

		if (intersects.length > 0) {
			const hit = intersects[0];
			const data = hit.object.userData;

			if (!this.hoveredTile || this.hoveredTile.x !== data.x || this.hoveredTile.y !== data.y) {
				this.hoveredTile = data;
				this.onHoverChange();
			}
		} else {
			if (this.hoveredTile) {
				this.hoveredTile = null;
				this.onHoverChange();
			}
		}
	}

	handlePointerLeave() {
		if (this.hoveredTile) {
			this.hoveredTile = null;
			this.onHoverChange();
		}
	}

	handlePointerUp(e) {
		// Distinguish click from drag
		const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
		if (dist > 5) return; // User was dragging/orbiting the camera

		if (this.hoveredTile && this.callbacks.onTileSelect) {
			this.callbacks.onTileSelect(this.hoveredTile.tile);
		}
	}

	onHoverChange() {
		if (this.callbacks.onTileHover) {
			this.callbacks.onTileHover(this.hoveredTile ? this.hoveredTile.tile : null);
		}

		if (!this.hoveredTile) {
			this.hoverIndicator.visible = false;
			this.ghostGroup.visible = false;
			return;
		}

		// Update Hover Indicator position
		this.hoverIndicator.visible = true;
		this.hoverIndicator.position.set(
			this.hoveredTile.worldX,
			this.hoveredTile.baseY + 0.1,
			this.hoveredTile.worldZ
		);

		// Update 3D Ghost Preview
		this.updateGhostModel();
	}

	updateGhostModel() {
		// Clear previous ghost
		while (this.ghostGroup.children.length > 0) {
			this.ghostGroup.remove(this.ghostGroup.children[0]);
		}

		if (!this.selectedBuildingId || !this.hoveredTile || !this.run) {
			this.ghostGroup.visible = false;
			return;
		}

		// Check legality via engine's previewPlacement
		const preview = previewPlacement(
			this.run,
			this.selectedBuildingId,
			this.hoveredTile.x,
			this.hoveredTile.y
		);
		const isLegal = preview?.ok;

		const ghost = createGhostModel(this.selectedBuildingId, isLegal);
		this.ghostGroup.add(ghost);
		this.ghostGroup.position.set(
			this.hoveredTile.worldX,
			this.hoveredTile.baseY + 0.05,
			this.hoveredTile.worldZ
		);
		this.ghostGroup.visible = true;
	}

	dispose() {
		this.domElement.removeEventListener('pointermove', this.onPointerMove);
		this.domElement.removeEventListener('pointerdown', this.onPointerDown);
		this.domElement.removeEventListener('pointerup', this.onPointerUp);
		this.domElement.removeEventListener('pointerleave', this.onPointerLeave);

		this.scene.remove(this.ghostGroup);
		this.scene.remove(this.hoverIndicator);
	}
}
