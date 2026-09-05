// @ts-nocheck
import * as THREE from 'three';

/**
 * Procedural low-poly 3D building models for The Constituency.
 * Designed for high visual fidelity, 60fps performance, and neo-brutalist Nigerian flavor.
 * All models fit within a normalized 1x1 tile footprint (scaled to TILE_SIZE).
 */

// Shared color palette matching the game's neo-brutalist theme
const COLORS = {
	concrete: 0xe2e8f0,
	concreteDark: 0x94a3b8,
	concreteBase: 0x64748b,
	wood: 0xb45309,
	hazardYellow: 0xfacc15,
	hazardBlack: 0x1e293b,
	waterBlue: 0x0ea5e9,
	waterLight: 0x7dd3fc,
	solarBlue: 0x1d4ed8,
	solarDark: 0x1e3a8a,
	transformerYellow: 0xeab308,
	schoolGreen: 0x15803d,
	schoolCream: 0xfef08a,
	clinicWhite: 0xf8fafc,
	clinicGreen: 0x16a34a,
	hospitalWhite: 0xffffff,
	hospitalGlass: 0x38bdf8,
	policeBlue: 0x1e3a8a,
	policeYellow: 0xfacc15,
	housingTerracotta: 0xc2410c,
	housingWall: 0xfef3c7,
	marketTarpYellow: 0xfacc15,
	marketTarpBlue: 0x2563eb,
	marketTarpGreen: 0x16a34a,
	marketTarpRed: 0xdc2626,
	marketWood: 0x78350f,
	businessGlass: 0x0284c7,
	businessFrame: 0x334155,
	wasteGreen: 0x15803d,
	wasteTrash: 0x71717a,
	metalRoof: 0x94a3b8,
	rustTin: 0x9a3412
};

// Reusable standard materials (Toon / Flat-shaded phong for neo-brutalist look)
const materials = {};
function getMaterial(color, options = {}) {
	const key = `${color}_${options.roughness || 0.6}_${options.metalness || 0.1}_${options.transparent ? 'trans' : 'opaque'}_${options.opacity || 1}`;
	if (!materials[key]) {
		materials[key] = new THREE.MeshStandardMaterial({
			color,
			roughness: options.roughness ?? 0.65,
			metalness: options.metalness ?? 0.1,
			flatShading: true,
			transparent: !!options.transparent,
			opacity: options.opacity ?? 1,
			wireframe: !!options.wireframe
		});
	}
	return materials[key];
}

/** Helper to create an edged box mesh */
function createBox(w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
	const geo = new THREE.BoxGeometry(w, h, d);
	const mat = getMaterial(color, options);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y + h / 2, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

/** Helper to create a cylinder mesh */
function createCylinder(radiusTop, radiusBottom, height, segments, color, x = 0, y = 0, z = 0) {
	const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
	const mat = getMaterial(color);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y + height / 2, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

/** Helper to create a cone/pyramid roof */
function createPyramid(radius, height, radialSegments, color, x = 0, y = 0, z = 0) {
	const geo = new THREE.ConeGeometry(radius, height, radialSegments);
	const mat = getMaterial(color);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y + height / 2, z);
	mesh.rotation.y = Math.PI / 4;
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

// -------------------------------------------------------------
// BUILDING MODEL BUILDERS
// -------------------------------------------------------------

/** 1. BOREHOLE (Water) */
function buildBorehole() {
	const group = new THREE.Group();
	// Concrete washing pad / apron
	group.add(createBox(0.75, 0.08, 0.75, COLORS.concrete, 0, 0, 0));
	group.add(createBox(0.65, 0.04, 0.65, COLORS.concreteDark, 0, 0.08, 0));
	// Water puddle splash
	group.add(createBox(0.35, 0.01, 0.35, COLORS.waterLight, 0.1, 0.12, 0.1));
	// Pump stand / body
	group.add(createCylinder(0.045, 0.06, 0.45, 8, COLORS.hazardBlack, -0.1, 0.1, 0));
	// Pump head and handle
	group.add(createBox(0.09, 0.09, 0.12, COLORS.hazardBlack, -0.1, 0.55, 0));
	const handle = createBox(0.32, 0.03, 0.03, COLORS.hazardBlack, 0.04, 0.58, 0);
	handle.rotation.z = -0.3;
	group.add(handle);
	// Spout
	group.add(createBox(0.14, 0.04, 0.04, COLORS.hazardBlack, -0.18, 0.48, 0));
	// Blue 20L Jerrycans on pad (ubiquitous Nigerian water fetching jerrycans)
	group.add(createBox(0.12, 0.16, 0.1, COLORS.waterBlue, 0.18, 0.12, -0.15));
	group.add(createBox(0.11, 0.15, 0.1, COLORS.hazardYellow, 0.22, 0.12, 0.04));
	group.add(createBox(0.1, 0.14, 0.09, COLORS.waterBlue, 0.1, 0.12, 0.2));
	return group;
}

/** 2. WATER WORKS (Water) */
function buildWaterWorks() {
	const group = new THREE.Group();
	// Base foundation
	group.add(createBox(0.85, 0.08, 0.85, COLORS.concrete, 0, 0, 0));
	// Elevated Water Tower Stanchion (4 legs)
	const legH = 0.55;
	const legOffsets = [-0.2, 0.2];
	legOffsets.forEach((lx) => {
		legOffsets.forEach((lz) => {
			group.add(createBox(0.04, legH, 0.04, COLORS.hazardBlack, lx - 0.12, 0.08, lz));
		});
	});
	// Tower water tank (Sky blue cylinder)
	group.add(createCylinder(0.24, 0.24, 0.38, 12, COLORS.waterBlue, -0.12, 0.08 + legH, 0));
	group.add(createCylinder(0.25, 0.24, 0.06, 12, COLORS.waterLight, -0.12, 0.08 + legH + 0.38, 0));
	// Pipe ladder on tank
	group.add(createBox(0.04, 0.9, 0.02, COLORS.concreteDark, -0.36, 0.08, 0));
	// Pump house building
	group.add(createBox(0.35, 0.32, 0.55, COLORS.concreteDark, 0.22, 0.08, 0));
	group.add(createBox(0.38, 0.05, 0.58, COLORS.metalRoof, 0.22, 0.4, 0));
	// Treatment filtration tanks
	group.add(createCylinder(0.12, 0.12, 0.2, 10, COLORS.waterLight, 0.2, 0.08, 0.28));
	group.add(createCylinder(0.12, 0.12, 0.2, 10, COLORS.waterLight, -0.12, 0.08, 0.3));
	// Blue connecting pipe
	const pipe = createBox(0.35, 0.04, 0.04, COLORS.waterBlue, 0.05, 0.2, 0.28);
	group.add(pipe);
	return group;
}

/** 3. SOLAR MINI-GRID (Power) */
function buildSolarMiniGrid() {
	const group = new THREE.Group();
	// Gravel ground slab
	group.add(createBox(0.88, 0.05, 0.88, COLORS.concreteBase, 0, 0, 0));
	// Racks of angled solar panels (3 rows)
	const rowZ = [-0.25, 0.02, 0.28];
	rowZ.forEach((rz) => {
		// Rack frame
		group.add(createBox(0.72, 0.12, 0.04, COLORS.concreteDark, 0, 0.05, rz - 0.06));
		group.add(createBox(0.72, 0.2, 0.04, COLORS.concreteDark, 0, 0.05, rz + 0.06));
		// Angled panel
		const panel = createBox(0.72, 0.02, 0.22, COLORS.solarBlue, 0, 0.18, rz);
		panel.rotation.x = -0.35;
		group.add(panel);
	});
	// Inverter and battery cabinet
	group.add(createBox(0.2, 0.26, 0.16, COLORS.concrete, 0.32, 0.05, -0.3));
	group.add(createBox(0.04, 0.04, 0.02, COLORS.hazardYellow, 0.32, 0.22, -0.21));
	// Chainlink security fence posts
	const fenceCoords = [
		[-0.42, -0.42],
		[0.42, -0.42],
		[0.42, 0.42],
		[-0.42, 0.42]
	];
	fenceCoords.forEach(([fx, fz]) => {
		group.add(createBox(0.03, 0.3, 0.03, COLORS.hazardBlack, fx, 0.05, fz));
	});
	return group;
}

/** 4. TRANSFORMER (Power) */
function buildTransformer() {
	const group = new THREE.Group();
	// Concrete plinth
	group.add(createBox(0.75, 0.1, 0.75, COLORS.concrete, 0, 0, 0));
	// Yellow Step-down transformer unit with cooling fins
	group.add(createBox(0.42, 0.46, 0.38, COLORS.transformerYellow, 0, 0.1, 0));
	// Cooling radiator fins on sides
	for (let i = -0.15; i <= 0.15; i += 0.075) {
		group.add(createBox(0.46, 0.35, 0.02, 0xca8a04, 0, 0.14, i));
	}
	// Bushing insulators on top (ceramic cones)
	[-0.12, 0, 0.12].forEach((bx) => {
		group.add(createCylinder(0.02, 0.04, 0.14, 6, 0xd97706, bx, 0.56, 0));
		group.add(createBox(0.015, 0.06, 0.015, COLORS.hazardBlack, bx, 0.7, 0));
	});
	// Protective perimeter safety cage / fence
	group.add(createBox(0.68, 0.38, 0.02, COLORS.hazardBlack, 0, 0.1, -0.32));
	group.add(createBox(0.68, 0.38, 0.02, COLORS.hazardBlack, 0, 0.1, 0.32));
	group.add(createBox(0.02, 0.38, 0.64, COLORS.hazardBlack, -0.32, 0.1, 0));
	group.add(createBox(0.02, 0.38, 0.64, COLORS.hazardBlack, 0.32, 0.1, 0));
	// Danger notice board
	group.add(createBox(0.14, 0.1, 0.02, COLORS.hazardYellow, 0, 0.28, 0.34));
	return group;
}

/** 5. PRIMARY SCHOOL (Education) */
function buildPrimarySchool() {
	const group = new THREE.Group();
	// School compound ground
	group.add(createBox(0.88, 0.04, 0.88, COLORS.concreteBase, 0, 0, 0));
	// L-shaped School classroom block (Cream walls)
	// Main wing
	group.add(createBox(0.68, 0.26, 0.26, COLORS.schoolCream, -0.06, 0.04, -0.25));
	// Pitched Green Corrugated Roof
	const roofMain = createPyramid(0.42, 0.16, 4, COLORS.schoolGreen, -0.06, 0.3, -0.25);
	roofMain.scale.set(1.7, 1, 0.8);
	group.add(roofMain);
	// Side wing
	group.add(createBox(0.24, 0.26, 0.42, COLORS.schoolCream, -0.28, 0.04, 0.08));
	const roofSide = createPyramid(0.3, 0.15, 4, COLORS.schoolGreen, -0.28, 0.3, 0.08);
	roofSide.scale.set(0.9, 1, 1.5);
	group.add(roofSide);
	// Veranda walkway pillars
	for (let px = -0.15; px <= 0.22; px += 0.12) {
		group.add(createBox(0.025, 0.22, 0.025, COLORS.concreteDark, px, 0.04, -0.11));
	}
	// Nigerian Flagpole (Green-White-Green) in school courtyard
	group.add(createCylinder(0.015, 0.02, 0.65, 6, COLORS.concreteDark, 0.22, 0.04, 0.2));
	const flag = createBox(0.14, 0.08, 0.01, COLORS.schoolGreen, 0.29, 0.58, 0.2);
	group.add(flag);
	// Mini football goalpost on assembly field
	group.add(createBox(0.22, 0.02, 0.02, COLORS.concrete, 0.18, 0.14, -0.02));
	group.add(createBox(0.02, 0.12, 0.02, COLORS.concrete, 0.08, 0.04, -0.02));
	group.add(createBox(0.02, 0.12, 0.02, COLORS.concrete, 0.28, 0.04, -0.02));
	return group;
}

/** 6. CLINIC (Health) */
function buildClinic() {
	const group = new THREE.Group();
	// Base foundation
	group.add(createBox(0.85, 0.06, 0.85, COLORS.concrete, 0, 0, 0));
	// Main healthcare clinic bungalow (White sandcrete)
	group.add(createBox(0.58, 0.3, 0.5, COLORS.clinicWhite, -0.08, 0.06, 0));
	// Green hipped roof
	const roof = createPyramid(0.48, 0.18, 4, COLORS.clinicGreen, -0.08, 0.36, 0);
	roof.scale.set(1.3, 1, 1.15);
	group.add(roof);
	// Red Cross insignia on front wall
	group.add(createBox(0.04, 0.12, 0.02, 0xdc2626, -0.08, 0.22, 0.26));
	group.add(createBox(0.12, 0.04, 0.02, 0xdc2626, -0.08, 0.22, 0.26));
	// Ambulance bay canopy
	group.add(createBox(0.24, 0.03, 0.32, COLORS.concreteDark, 0.28, 0.25, 0.06));
	group.add(createBox(0.02, 0.2, 0.02, COLORS.hazardBlack, 0.38, 0.06, 0.2));
	// Parked tricycle / mini-ambulance
	group.add(createBox(0.14, 0.12, 0.2, COLORS.clinicGreen, 0.26, 0.06, 0.06));
	return group;
}

/** 7. GENERAL HOSPITAL (Health) */
function buildHospital() {
	const group = new THREE.Group();
	// Polished concrete plaza
	group.add(createBox(0.9, 0.06, 0.9, COLORS.concrete, 0, 0, 0));
	// Central multi-story tower (3 levels)
	group.add(createBox(0.55, 0.72, 0.45, COLORS.hospitalWhite, 0, 0.06, -0.05));
	// Side emergency wing
	group.add(createBox(0.28, 0.38, 0.35, COLORS.clinicWhite, -0.28, 0.06, 0.1));
	// Glass curtain entrance
	group.add(createBox(0.3, 0.28, 0.03, COLORS.hospitalGlass, 0, 0.06, 0.18));
	// Rooftop Helipad / AC equipment
	group.add(createBox(0.36, 0.04, 0.36, COLORS.concreteDark, 0, 0.78, -0.05));
	group.add(createCylinder(0.12, 0.12, 0.02, 12, 0xfacc15, 0, 0.82, -0.05));
	// Emergency Red Cross beacon on tower facade
	group.add(createBox(0.05, 0.16, 0.02, 0xdc2626, 0, 0.62, 0.18));
	group.add(createBox(0.16, 0.05, 0.02, 0xdc2626, 0, 0.62, 0.18));
	// Ambulance bay porch
	group.add(createBox(0.3, 0.03, 0.25, COLORS.concreteDark, 0.25, 0.2, 0.2));
	group.add(createBox(0.02, 0.14, 0.02, COLORS.concreteDark, 0.38, 0.06, 0.3));
	// White Ambulance van
	group.add(createBox(0.14, 0.12, 0.22, COLORS.hospitalWhite, 0.25, 0.06, 0.2));
	group.add(createBox(0.04, 0.03, 0.04, 0xdc2626, 0.25, 0.18, 0.2));
	return group;
}

/** 8. ROAD (Roads) */
function buildRoad(connections = { north: true, south: true, east: false, west: false }) {
	const group = new THREE.Group();
	// Road asphalt bed
	group.add(createBox(0.98, 0.05, 0.98, 0x334155, 0, 0, 0));
	// Raised sidewalks/curbs on inactive sides
	if (!connections.north)
		group.add(createBox(0.98, 0.08, 0.14, COLORS.concreteDark, 0, 0.05, -0.42));
	if (!connections.south)
		group.add(createBox(0.98, 0.08, 0.14, COLORS.concreteDark, 0, 0.05, 0.42));
	if (!connections.west)
		group.add(createBox(0.14, 0.08, 0.98, COLORS.concreteDark, -0.42, 0.05, 0));
	if (!connections.east) group.add(createBox(0.14, 0.08, 0.98, COLORS.concreteDark, 0.42, 0.05, 0));
	// Yellow/white center road markings
	if (connections.north || connections.south) {
		group.add(createBox(0.04, 0.005, 0.35, 0xfef08a, 0, 0.055, -0.25));
		group.add(createBox(0.04, 0.005, 0.35, 0xfef08a, 0, 0.055, 0.25));
	}
	if (connections.east || connections.west) {
		group.add(createBox(0.35, 0.005, 0.04, 0xfef08a, -0.25, 0.055, 0));
		group.add(createBox(0.35, 0.005, 0.04, 0xfef08a, 0.25, 0.055, 0));
	}
	if (!connections.north && !connections.south && !connections.east && !connections.west) {
		// Standalone road tile
		group.add(createBox(0.04, 0.005, 0.4, 0xfef08a, 0, 0.055, 0));
	}
	// Low-poly streetlamp on edge
	group.add(createCylinder(0.015, 0.02, 0.45, 6, COLORS.hazardBlack, 0.4, 0.05, 0.35));
	group.add(createBox(0.06, 0.02, 0.04, 0xfef08a, 0.36, 0.48, 0.35));
	return group;
}

/** 9. POLICE POST (Security) */
function buildPolicePost() {
	const group = new THREE.Group();
	// Base concrete slab
	group.add(createBox(0.85, 0.06, 0.85, COLORS.concrete, 0, 0, 0));
	// Police station building
	group.add(createBox(0.55, 0.32, 0.45, COLORS.policeBlue, -0.06, 0.06, -0.06));
	// Nigerian Police Stripes on front wall (Yellow and Black accent)
	group.add(createBox(0.56, 0.05, 0.02, COLORS.policeYellow, -0.06, 0.24, 0.17));
	group.add(createBox(0.56, 0.05, 0.02, COLORS.hazardBlack, -0.06, 0.18, 0.17));
	// Metal roof
	group.add(createBox(0.6, 0.04, 0.5, COLORS.metalRoof, -0.06, 0.38, -0.06));
	// Tall Communications Mast / Antenna
	group.add(createCylinder(0.01, 0.02, 0.85, 6, 0xdc2626, 0.3, 0.06, -0.28));
	group.add(createBox(0.08, 0.04, 0.02, COLORS.concrete, 0.3, 0.82, -0.28));
	// Sandbag perimeter bunker / check-point
	group.add(createBox(0.3, 0.12, 0.1, 0xb45309, 0.18, 0.06, 0.28));
	// Barrier stop pole
	const pole = createBox(0.35, 0.025, 0.025, COLORS.policeYellow, -0.16, 0.12, 0.32);
	group.add(pole);
	return group;
}

/** 10. HOUSING ESTATE (Housing) */
function buildHousingEstate() {
	const group = new THREE.Group();
	// Compound sand ground
	group.add(createBox(0.88, 0.04, 0.88, COLORS.housingWall, 0, 0, 0));
	// Perimeter sandcrete compound wall
	group.add(createBox(0.86, 0.15, 0.03, COLORS.concreteDark, 0, 0.04, -0.42));
	group.add(createBox(0.86, 0.15, 0.03, COLORS.concreteDark, 0, 0.04, 0.42));
	group.add(createBox(0.03, 0.15, 0.82, COLORS.concreteDark, -0.42, 0.04, 0));
	group.add(createBox(0.03, 0.15, 0.82, COLORS.concreteDark, 0.42, 0.04, 0));
	// 2 Bungalow residences with Terracotta hipped roofs
	const houseOffsets = [
		{ x: -0.18, z: -0.18, scale: 1 },
		{ x: 0.18, z: 0.18, scale: 0.9 }
	];
	houseOffsets.forEach(({ x, z, scale }) => {
		const hw = 0.32 * scale;
		const hd = 0.3 * scale;
		const hh = 0.24 * scale;
		group.add(createBox(hw, hh, hd, 0xfffbeb, x, 0.04, z));
		const roof = createPyramid(
			0.26 * scale,
			0.16 * scale,
			4,
			COLORS.housingTerracotta,
			x,
			0.04 + hh,
			z
		);
		roof.scale.set(1.3, 1, 1.2);
		group.add(roof);
	});
	// Black overhead GeePee water tank on steel stanchion
	group.add(createBox(0.03, 0.35, 0.03, COLORS.hazardBlack, -0.28, 0.04, 0.26));
	group.add(createCylinder(0.08, 0.08, 0.15, 10, COLORS.hazardBlack, -0.28, 0.38, 0.26));
	return group;
}

/** 11. MARKET (Jobs) */
function buildMarket() {
	const group = new THREE.Group();
	// Dusty red laterite earth floor
	group.add(createBox(0.88, 0.04, 0.88, 0xb45309, 0, 0, 0));
	// Open-air market stall tables with colorful umbrellas
	const stalls = [
		{ x: -0.22, z: -0.22, color: COLORS.marketTarpYellow },
		{ x: 0.22, z: -0.2, color: COLORS.marketTarpBlue },
		{ x: -0.2, z: 0.22, color: COLORS.marketTarpGreen },
		{ x: 0.22, z: 0.22, color: COLORS.marketTarpRed }
	];
	stalls.forEach(({ x, z, color }) => {
		// Table & produce crates
		group.add(createBox(0.2, 0.08, 0.16, COLORS.marketWood, x, 0.04, z));
		group.add(createBox(0.08, 0.05, 0.08, 0xf97316, x - 0.04, 0.12, z));
		// Umbrella pole
		group.add(createCylinder(0.01, 0.015, 0.3, 6, COLORS.hazardBlack, x, 0.04, z));
		// Umbrella canopy (hexagonal cone)
		const umbrella = createPyramid(0.18, 0.1, 6, color, x, 0.3, z);
		umbrella.rotation.y = Math.random();
		group.add(umbrella);
	});
	// Small central lockup levy office
	group.add(createBox(0.18, 0.22, 0.18, COLORS.concreteDark, 0, 0.04, 0));
	group.add(createBox(0.2, 0.03, 0.2, COLORS.metalRoof, 0, 0.26, 0));
	return group;
}

/** 12. BUSINESS HUB (Jobs) */
function buildBusinessHub() {
	const group = new THREE.Group();
	// Clean paved entrance forecourt
	group.add(createBox(0.9, 0.06, 0.9, COLORS.concrete, 0, 0, 0));
	// Main 2-story commercial shopping complex
	group.add(createBox(0.72, 0.52, 0.62, COLORS.businessFrame, 0, 0.06, -0.04));
	// Glazed shopfront windows on ground floor
	group.add(createBox(0.68, 0.18, 0.02, COLORS.businessGlass, 0, 0.1, 0.28));
	// Upper floor office windows
	group.add(createBox(0.68, 0.16, 0.02, COLORS.businessGlass, 0, 0.36, 0.28));
	// Overhanging modern fascia board / corporate signage
	group.add(createBox(0.74, 0.08, 0.04, COLORS.hazardYellow, 0, 0.52, 0.28));
	// Rooftop generator enclosure and air conditioning units
	group.add(createBox(0.22, 0.16, 0.18, COLORS.concreteDark, -0.2, 0.58, -0.1));
	group.add(createBox(0.12, 0.1, 0.1, 0x64748b, 0.18, 0.58, 0.05));
	group.add(createBox(0.12, 0.1, 0.1, 0x64748b, 0.18, 0.58, -0.18));
	return group;
}

/** 13. WASTE DEPOT (Sanitation) */
function buildWasteDepot() {
	const group = new THREE.Group();
	// Muddy concrete apron
	group.add(createBox(0.88, 0.05, 0.88, 0x52525b, 0, 0, 0));
	// Low retaining walls
	group.add(createBox(0.86, 0.18, 0.04, COLORS.concreteBase, 0, 0.05, -0.4));
	group.add(createBox(0.04, 0.18, 0.82, COLORS.concreteBase, -0.4, 0.05, 0));
	group.add(createBox(0.04, 0.18, 0.82, COLORS.concreteBase, 0.4, 0.05, 0));
	// Green Municipal Waste Skip Bins
	group.add(createBox(0.22, 0.16, 0.32, COLORS.wasteGreen, -0.18, 0.05, -0.15));
	group.add(createBox(0.22, 0.16, 0.32, COLORS.wasteGreen, -0.18, 0.05, 0.18));
	// Refuse / compost mound
	group.add(createPyramid(0.2, 0.15, 6, COLORS.wasteTrash, 0.18, 0.05, -0.18));
	// Waste Compactor / Sanitation truck
	group.add(createBox(0.18, 0.16, 0.36, COLORS.hazardYellow, 0.18, 0.05, 0.15));
	group.add(createBox(0.18, 0.12, 0.12, COLORS.hazardBlack, 0.18, 0.05, 0.32));
	return group;
}

/** UNDER CONSTRUCTION SITE (Used for any building with turnsLeft > 0) */
function buildUnderConstructionSite() {
	const group = new THREE.Group();
	// Exposed foundation concrete slab
	group.add(createBox(0.82, 0.06, 0.82, COLORS.concreteDark, 0, 0, 0));
	// Foundation trench & rebar columns rising
	const rebarOffsets = [-0.25, 0, 0.25];
	rebarOffsets.forEach((rx) => {
		rebarOffsets.forEach((rz) => {
			group.add(createBox(0.025, 0.35, 0.025, 0x78716c, rx, 0.06, rz));
		});
	});
	// Wooden Scaffolding towers
	group.add(createBox(0.03, 0.5, 0.03, COLORS.wood, -0.32, 0.06, -0.32));
	group.add(createBox(0.03, 0.5, 0.03, COLORS.wood, 0.32, 0.06, -0.32));
	group.add(createBox(0.03, 0.5, 0.03, COLORS.wood, -0.32, 0.06, 0.32));
	group.add(createBox(0.03, 0.5, 0.03, COLORS.wood, 0.32, 0.06, 0.32));
	// Cross bracing
	group.add(createBox(0.64, 0.02, 0.02, COLORS.wood, 0, 0.3, -0.32));
	group.add(createBox(0.64, 0.02, 0.02, COLORS.wood, 0, 0.3, 0.32));
	// Mini yellow construction crane / hoist
	group.add(createCylinder(0.02, 0.03, 0.65, 6, COLORS.hazardYellow, 0, 0.06, 0));
	const jib = createBox(0.55, 0.04, 0.04, COLORS.hazardYellow, 0.15, 0.7, 0);
	group.add(jib);
	// Yellow/Black Hazard Board
	group.add(createBox(0.25, 0.16, 0.02, COLORS.hazardYellow, -0.22, 0.1, 0.34));
	group.add(createBox(0.22, 0.03, 0.025, COLORS.hazardBlack, -0.22, 0.14, 0.34));
	return group;
}

// -------------------------------------------------------------
// PUBLIC API
// -------------------------------------------------------------

/**
 * Creates a complete 3D model instance for a building type.
 * @param {string} buildingId
 * @param {boolean} [underConstruction=false]
 * @param {object} [roadConnections] - Only used if buildingId === 'road'
 * @returns {THREE.Group}
 */
export function createBuildingModel(buildingId, underConstruction = false, roadConnections) {
	if (underConstruction) {
		return buildUnderConstructionSite();
	}

	switch (buildingId) {
		case 'borehole':
			return buildBorehole();
		case 'water_works':
			return buildWaterWorks();
		case 'solar_minigrid':
			return buildSolarMiniGrid();
		case 'transformer':
			return buildTransformer();
		case 'primary_school':
			return buildPrimarySchool();
		case 'clinic':
			return buildClinic();
		case 'hospital':
			return buildHospital();
		case 'road':
			return buildRoad(roadConnections);
		case 'police_post':
			return buildPolicePost();
		case 'housing_estate':
			return buildHousingEstate();
		case 'market':
			return buildMarket();
		case 'business_hub':
			return buildBusinessHub();
		case 'waste_depot':
			return buildWasteDepot();
		default:
			return buildUnderConstructionSite();
	}
}

/**
 * Creates a translucent ghost preview model for placement raycasting.
 * @param {string} buildingId
 * @param {boolean} isLegal
 * @returns {THREE.Group}
 */
export function createGhostModel(buildingId, isLegal = true) {
	const model = createBuildingModel(buildingId, false);
	const ghostColor = isLegal ? 0x10b981 : 0xf43f5e; // Emerald green or Rose red
	const ghostMat = new THREE.MeshStandardMaterial({
		color: ghostColor,
		emissive: ghostColor,
		emissiveIntensity: 0.45,
		transparent: true,
		opacity: 0.65,
		roughness: 0.3,
		flatShading: true
	});

	model.traverse((child) => {
		if (child.isMesh) {
			child.material = ghostMat;
			child.castShadow = false;
			child.receiveShadow = false;
		}
	});

	return model;
}
