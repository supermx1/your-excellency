// @ts-nocheck
import * as THREE from 'three';

/**
 * Smooth strategy-game camera controller for Three.js.
 * Handles orbit, pan, zoom, touch pinch/drag, and focal target transitions.
 */
export class CameraController {
	/**
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {HTMLElement} domElement
	 * @param {number} boardRadius
	 */
	constructor(camera, domElement, boardRadius = 15) {
		this.camera = camera;
		this.domElement = domElement;
		this.boardRadius = boardRadius;

		// Spherical coordinates (distance, polar angle phi, azimuthal angle theta)
		this.target = new THREE.Vector3(0, 0, 0);
		this.desiredTarget = new THREE.Vector3(0, 0, 0);

		this.distance = 28;
		this.desiredDistance = 28;
		this.minDistance = 6;
		this.maxDistance = 50;

		this.phi = Math.PI / 3.4; // ~52 degrees elevation
		this.desiredPhi = Math.PI / 3.4;
		this.minPhi = 0.25; // ~15 degrees min elevation
		this.maxPhi = Math.PI / 2 - 0.05; // ~87 degrees max (near top-down)

		this.theta = Math.PI / 4; // 45 degrees isometric angle
		this.desiredTheta = Math.PI / 4;

		this.damping = 0.12;
		this.isDragging = false;
		this.isPanning = false;
		this.previousMousePosition = { x: 0, y: 0 };
		this.touchStartDist = 0;

		this.bindEvents();
		this.updateCameraPosition(true);
	}

	bindEvents() {
		this.onMouseDown = this.handleMouseDown.bind(this);
		this.onMouseMove = this.handleMouseMove.bind(this);
		this.onMouseUp = this.handleMouseUp.bind(this);
		this.onWheel = this.handleWheel.bind(this);
		this.onTouchStart = this.handleTouchStart.bind(this);
		this.onTouchMove = this.handleTouchMove.bind(this);
		this.onTouchEnd = this.handleTouchEnd.bind(this);
		this.onContextMenu = (e) => e.preventDefault();

		this.domElement.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
		this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
		window.addEventListener('touchmove', this.onTouchMove, { passive: false });
		window.addEventListener('touchend', this.onTouchEnd);
		this.domElement.addEventListener('contextmenu', this.onContextMenu);
	}

	handleMouseDown(e) {
		// Right click or middle click or Shift+left click -> Pan
		if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
			this.isPanning = true;
			this.isDragging = false;
		} else if (e.button === 0) {
			this.isDragging = true;
			this.isPanning = false;
		}
		this.previousMousePosition = { x: e.clientX, y: e.clientY };
	}

	handleMouseMove(e) {
		if (!this.isDragging && !this.isPanning) return;

		const deltaX = e.clientX - this.previousMousePosition.x;
		const deltaY = e.clientY - this.previousMousePosition.y;
		this.previousMousePosition = { x: e.clientX, y: e.clientY };

		if (this.isDragging) {
			// Orbit rotation
			this.desiredTheta -= deltaX * 0.006;
			this.desiredPhi = Math.max(
				this.minPhi,
				Math.min(this.maxPhi, this.desiredPhi - deltaY * 0.005)
			);
		} else if (this.isPanning) {
			// Pan target along view plane
			const panSpeed = (this.distance / 20) * 0.02;
			const forward = new THREE.Vector3();
			this.camera.getWorldDirection(forward);
			forward.y = 0;
			forward.normalize();

			const right = new THREE.Vector3();
			right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

			this.desiredTarget.addScaledVector(right, -deltaX * panSpeed);
			this.desiredTarget.addScaledVector(forward, deltaY * panSpeed);

			// Clamp pan within board bounds
			const limit = this.boardRadius * 1.1;
			this.desiredTarget.x = Math.max(-limit, Math.min(limit, this.desiredTarget.x));
			this.desiredTarget.z = Math.max(-limit, Math.min(limit, this.desiredTarget.z));
		}
	}

	handleMouseUp() {
		this.isDragging = false;
		this.isPanning = false;
	}

	handleWheel(e) {
		e.preventDefault();
		const zoomDelta = e.deltaY * 0.02;
		this.desiredDistance = Math.max(
			this.minDistance,
			Math.min(this.maxDistance, this.desiredDistance + zoomDelta)
		);
	}

	handleTouchStart(e) {
		if (e.touches.length === 1) {
			this.isDragging = true;
			this.isPanning = false;
			this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		} else if (e.touches.length === 2) {
			this.isDragging = false;
			this.isPanning = true;
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			this.touchStartDist = Math.hypot(dx, dy);
			this.previousMousePosition = {
				x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
				y: (e.touches[0].clientY + e.touches[1].clientY) / 2
			};
		}
	}

	handleTouchMove(e) {
		if (e.touches.length === 1 && this.isDragging) {
			const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
			const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
			this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

			this.desiredTheta -= deltaX * 0.008;
			this.desiredPhi = Math.max(
				this.minPhi,
				Math.min(this.maxPhi, this.desiredPhi - deltaY * 0.006)
			);
		} else if (e.touches.length === 2) {
			e.preventDefault();
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.hypot(dx, dy);
			const pinchDelta = (this.touchStartDist - dist) * 0.05;
			this.touchStartDist = dist;

			this.desiredDistance = Math.max(
				this.minDistance,
				Math.min(this.maxDistance, this.desiredDistance + pinchDelta)
			);

			// Two-finger pan
			const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
			const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
			const deltaX = midX - this.previousMousePosition.x;
			const deltaY = midY - this.previousMousePosition.y;
			this.previousMousePosition = { x: midX, y: midY };

			const panSpeed = (this.distance / 20) * 0.03;
			const forward = new THREE.Vector3();
			this.camera.getWorldDirection(forward);
			forward.y = 0;
			forward.normalize();
			const right = new THREE.Vector3()
				.crossVectors(forward, new THREE.Vector3(0, 1, 0))
				.normalize();

			this.desiredTarget.addScaledVector(right, -deltaX * panSpeed);
			this.desiredTarget.addScaledVector(forward, deltaY * panSpeed);
		}
	}

	handleTouchEnd() {
		this.isDragging = false;
		this.isPanning = false;
	}

	// PRESETS
	setIsometricView() {
		this.desiredPhi = Math.PI / 3.4;
		this.desiredTheta = Math.PI / 4;
		this.desiredDistance = 28;
		this.desiredTarget.set(0, 0, 0);
	}

	setTopDownView() {
		this.desiredPhi = Math.PI / 2 - 0.08;
		this.desiredDistance = 32;
		this.desiredTarget.set(0, 0, 0);
	}

	setCloseUpView() {
		this.desiredPhi = Math.PI / 4.5;
		this.desiredDistance = 14;
	}

	focusOnTile(worldX, worldZ) {
		this.desiredTarget.set(worldX, 0, worldZ);
		this.desiredDistance = Math.max(this.minDistance, Math.min(18, this.desiredDistance));
	}

	rotateStep(direction = 1) {
		// Quarter turn (90 deg)
		this.desiredTheta += (Math.PI / 2) * direction;
	}

	update() {
		// Smooth damping lerp
		this.distance = THREE.MathUtils.lerp(this.distance, this.desiredDistance, this.damping);
		this.phi = THREE.MathUtils.lerp(this.phi, this.desiredPhi, this.damping);
		this.theta = THREE.MathUtils.lerp(this.theta, this.desiredTheta, this.damping);
		this.target.lerp(this.desiredTarget, this.damping);

		this.updateCameraPosition();
	}

	updateCameraPosition(immediate = false) {
		const x = this.target.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
		const y = this.target.y + this.distance * Math.cos(this.phi);
		const z = this.target.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);

		this.camera.position.set(x, y, z);
		this.camera.lookAt(this.target);
	}

	dispose() {
		this.domElement.removeEventListener('mousedown', this.onMouseDown);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
		this.domElement.removeEventListener('wheel', this.onWheel);
		this.domElement.removeEventListener('touchstart', this.onTouchStart);
		window.removeEventListener('touchmove', this.onTouchMove);
		window.removeEventListener('touchend', this.onTouchEnd);
		this.domElement.removeEventListener('contextmenu', this.onContextMenu);
	}
}
