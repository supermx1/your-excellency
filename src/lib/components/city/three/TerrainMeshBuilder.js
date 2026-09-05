// @ts-nocheck
import * as THREE from 'three';
import { tileTypes } from '$lib/game/city/rulebook.js';

export const TILE_SIZE = 2.0;

// Palette for terrain types
const TERRAIN_COLORS = {
	town_centre: 0xfcd34d, // Warm amber pavement
	residential: 0xfed7aa, // Warm sand / light terracotta
	slum: 0xa8a29e, // Gritty stone / dust
	farmland: 0x84cc16, // Lush agricultural green
	farmlandFurrow: 0x65a30d,
	riverside: 0x38bdf8, // Vibrant tropical river
	waterDeep: 0x0284c7,
	scrub: 0xfef08a, // Savannah sun-bleached grass
	rock: 0x78716c,
	cliffBedrock: 0x292524, // Dark rich African bedrock
	cliffTopGrass: 0x4d7c0f,
	roadAsphalt: 0x334155,
	roadMarking: 0xfef08a
};

/**
 * Creates the entire 3D Terrain Diorama for The Constituency.
 * @param {object} grid - { size, tiles }
 * @returns {{
 *   terrainGroup: THREE.Group,
 *   tileMeshMap: Map<string, THREE.Mesh>,
 *   clickableMeshes: THREE.Mesh[],
 *   update: (time: number) => void,
 *   dispose: () => void
 * }}
 */
export function buildTerrainDiorama(grid) {
	const terrainGroup = new THREE.Group();
	const size = grid.size;
	const boardHalf = (size * TILE_SIZE) / 2;
	const tileMeshMap = new Map();
	const clickableMeshes = [];
	const disposables = [];

	// 1. ELEVATED DIORAMA PEDESTAL / CLIFF BASE
	const pedestalHeight = 1.4;
	const pedestalGeo = new THREE.BoxGeometry(
		size * TILE_SIZE + 0.5,
		pedestalHeight,
		size * TILE_SIZE + 0.5
	);
	const pedestalMat = new THREE.MeshStandardMaterial({
		color: TERRAIN_COLORS.cliffBedrock,
		roughness: 0.9,
		metalness: 0.05,
		flatShading: true
	});
	disposables.push(pedestalGeo, pedestalMat);
	const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
	pedestal.position.set(0, -pedestalHeight / 2, 0);
	pedestal.receiveShadow = true;
	terrainGroup.add(pedestal);

	// Beveled base rim trim
	const rimGeo = new THREE.BoxGeometry(size * TILE_SIZE + 0.7, 0.2, size * TILE_SIZE + 0.7);
	const rimMat = new THREE.MeshStandardMaterial({
		color: 0x1c1917,
		roughness: 0.95,
		flatShading: true
	});
	disposables.push(rimGeo, rimMat);
	const rim = new THREE.Mesh(rimGeo, rimMat);
	rim.position.set(0, -pedestalHeight, 0);
	terrainGroup.add(rim);

	// 2. INDIVIDUAL TILE PLATES (for raycasting, height variation, and terrain visual language)
	const waterSurfaces = [];

	grid.tiles.forEach((tile) => {
		const wx = (tile.x - (size - 1) / 2) * TILE_SIZE;
		const wz = (tile.y - (size - 1) / 2) * TILE_SIZE;

		const tileGroup = new THREE.Group();
		tileGroup.position.set(wx, 0, wz);

		let tileHeight = 0.15;
		let tileElevation = 0;
		let tileColor = TERRAIN_COLORS[tile.type] || 0xe2e8f0;

		if (tile.type === 'riverside') {
			// Sunken river channel
			tileHeight = 0.08;
			tileElevation = -0.06;
			tileColor = TERRAIN_COLORS.riverside;
		} else if (tile.type === 'town_centre') {
			tileHeight = 0.22;
			tileElevation = 0.04;
			tileColor = TERRAIN_COLORS.town_centre;
		} else if (tile.type === 'farmland') {
			tileHeight = 0.18;
			tileElevation = 0.02;
			tileColor = TERRAIN_COLORS.farmland;
		} else if (tile.type === 'slum') {
			tileHeight = 0.16;
			tileElevation = 0.01;
			tileColor = TERRAIN_COLORS.slum;
		} else if (tile.type === 'residential') {
			tileHeight = 0.17;
			tileElevation = 0.02;
			tileColor = TERRAIN_COLORS.residential;
		} else {
			// Scrub
			tileHeight = 0.15;
			tileElevation = 0;
			tileColor = TERRAIN_COLORS.scrub;
		}

		// Base tile slab (slightly smaller than TILE_SIZE for crisp separation lines)
		const slabMargin = 0.04;
		const slabW = TILE_SIZE - slabMargin;
		const slabGeo = new THREE.BoxGeometry(slabW, tileHeight, slabW);
		const slabMat = new THREE.MeshStandardMaterial({
			color: tileColor,
			roughness: tile.type === 'riverside' ? 0.2 : 0.75,
			metalness: tile.type === 'riverside' ? 0.2 : 0.05,
			flatShading: true
		});
		disposables.push(slabGeo, slabMat);

		const slabMesh = new THREE.Mesh(slabGeo, slabMat);
		slabMesh.position.y = tileElevation + tileHeight / 2;
		slabMesh.receiveShadow = true;
		slabMesh.castShadow = true;

		// Attach user data for raycasting
		slabMesh.userData = {
			tile,
			x: tile.x,
			y: tile.y,
			type: tile.type,
			worldX: wx,
			worldZ: wz,
			baseY: slabMesh.position.y
		};

		tileGroup.add(slabMesh);
		clickableMeshes.push(slabMesh);
		tileMeshMap.set(`${tile.x},${tile.y}`, slabMesh);

		// 3. TERRAIN-SPECIFIC PROCEDURAL ACCENTS
		if (tile.type === 'riverside') {
			// Shimmering river water layer
			const waterGeo = new THREE.PlaneGeometry(slabW - 0.02, slabW - 0.02, 4, 4);
			const waterMat = new THREE.MeshStandardMaterial({
				color: TERRAIN_COLORS.waterDeep,
				roughness: 0.15,
				metalness: 0.4,
				transparent: true,
				opacity: 0.88,
				flatShading: true
			});
			disposables.push(waterGeo, waterMat);
			const waterMesh = new THREE.Mesh(waterGeo, waterMat);
			waterMesh.rotation.x = -Math.PI / 2;
			waterMesh.position.y = tileElevation + tileHeight + 0.01;
			waterMesh.receiveShadow = true;
			tileGroup.add(waterMesh);
			waterSurfaces.push({ mesh: waterMesh, baseZ: wz, baseX: wx });

			// Embankment rocks
			const rockGeo = new THREE.DodecahedronGeometry(0.08, 0);
			const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
			disposables.push(rockGeo, rockMat);
			const rock = new THREE.Mesh(rockGeo, rockMat);
			rock.position.set(0.35 * TILE_SIZE, tileElevation + tileHeight + 0.04, -0.3 * TILE_SIZE);
			tileGroup.add(rock);
		} else if (tile.type === 'farmland') {
			// Furrow stripes (crop lines)
			for (let f = -0.35; f <= 0.35; f += 0.22) {
				const furrowGeo = new THREE.BoxGeometry(slabW * 0.9, 0.03, 0.08);
				const furrowMat = new THREE.MeshStandardMaterial({
					color: TERRAIN_COLORS.farmlandFurrow,
					roughness: 0.85,
					flatShading: true
				});
				disposables.push(furrowGeo, furrowMat);
				const furrow = new THREE.Mesh(furrowGeo, furrowMat);
				furrow.position.set(0, tileElevation + tileHeight + 0.015, f * TILE_SIZE);
				tileGroup.add(furrow);
			}
		} else if (tile.type === 'town_centre') {
			// Central paved plaza square pattern
			const plazaGeo = new THREE.BoxGeometry(slabW * 0.7, 0.02, slabW * 0.7);
			const plazaMat = new THREE.MeshStandardMaterial({
				color: 0xfbbf24,
				roughness: 0.6,
				flatShading: true
			});
			disposables.push(plazaGeo, plazaMat);
			const plaza = new THREE.Mesh(plazaGeo, plazaMat);
			plaza.position.set(0, tileElevation + tileHeight + 0.01, 0);
			tileGroup.add(plaza);
		} else if (tile.type === 'slum') {
			// Rusty corrugated scrap patches on ground
			const scrapGeo = new THREE.BoxGeometry(0.35, 0.02, 0.25);
			const scrapMat = new THREE.MeshStandardMaterial({
				color: 0x78716c,
				roughness: 0.9,
				flatShading: true
			});
			disposables.push(scrapGeo, scrapMat);
			const scrap = new THREE.Mesh(scrapGeo, scrapMat);
			scrap.rotation.y = 0.4;
			scrap.position.set(-0.2, tileElevation + tileHeight + 0.01, 0.15);
			tileGroup.add(scrap);
		}

		terrainGroup.add(tileGroup);
	});

	// 4. ANIMATION UPDATE LOOP (Water ripples, wave specular glint)
	function update(time) {
		waterSurfaces.forEach(({ mesh, baseX, baseZ }, i) => {
			const wave = Math.sin(time * 2.5 + baseX * 0.8 + baseZ * 0.5) * 0.015;
			mesh.position.y = -0.06 + 0.08 + 0.01 + wave;
		});
	}

	function dispose() {
		disposables.forEach((item) => {
			if (item?.dispose) item.dispose();
		});
	}

	return {
		terrainGroup,
		tileMeshMap,
		clickableMeshes,
		update,
		dispose
	};
}

/**
 * Calculates road adjacency connections for a tile.
 * @param {object} grid
 * @param {number} x
 * @param {number} y
 * @returns {{ north: boolean, south: boolean, east: boolean, west: boolean }}
 */
export function getRoadConnections(grid, x, y) {
	const isRoad = (tx, ty) => {
		const t = grid.tiles.find((tile) => tile.x === tx && tile.y === ty);
		return t && t.buildingId === 'road';
	};

	return {
		north: isRoad(x, y - 1),
		south: isRoad(x, y + 1),
		west: isRoad(x - 1, y),
		east: isRoad(x + 1, y)
	};
}
