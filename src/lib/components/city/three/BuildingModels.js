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
	woodDark: 0x78350f,
	hazardYellow: 0xfacc15,
	hazardBlack: 0x1e293b,
	waterBlue: 0x0ea5e9,
	waterLight: 0x7dd3fc,
	solarBlue: 0x1d4ed8,
	solarDark: 0x1e3a8a,
	transformerYellow: 0xeab308,
	schoolGreen: 0x15803d,
	schoolGreenDark: 0x14532d,
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
	const key = `${color}_${options.roughness || 0.65}_${options.metalness || 0.1}_${options.transparent ? 'trans' : 'opaque'}_${options.opacity || 1}`;
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

/** Helper to create a cone mesh */
function createCone(radius, height, radialSegments, color, x = 0, y = 0, z = 0) {
	const geo = new THREE.ConeGeometry(radius, height, radialSegments);
	const mat = getMaterial(color);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y + height / 2, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

/**
 * Creates a clean architectural pitched Gable Roof with overhanging eaves,
 * triangular gable end walls, and ridge cap.
 */
function createGableRoof(width, height, depth, roofColor, ridgeColor = roofColor, x = 0, y = 0, z = 0) {
	const group = new THREE.Group();
	const halfW = width / 2;
	const slopeLen = Math.hypot(halfW, height);
	const angle = Math.atan2(height, halfW);

	// Left sloping roof face
	const leftSlope = createBox(slopeLen + 0.04, 0.03, depth, roofColor);
	leftSlope.rotation.z = angle;
	leftSlope.position.set(-halfW / 2, height / 2, 0);
	group.add(leftSlope);

	// Right sloping roof face
	const rightSlope = createBox(slopeLen + 0.04, 0.03, depth, roofColor);
	rightSlope.rotation.z = -angle;
	rightSlope.position.set(halfW / 2, height / 2, 0);
	group.add(rightSlope);

	// Ridge cap along top
	const ridge = createBox(0.04, 0.04, depth + 0.02, ridgeColor);
	ridge.position.set(0, height + 0.01, 0);
	group.add(ridge);

	// Triangular gable end walls (front & back)
	[-depth / 2 + 0.015, depth / 2 - 0.015].forEach((gz) => {
		const shape = new THREE.Shape();
		shape.moveTo(-halfW + 0.02, 0);
		shape.lineTo(halfW - 0.02, 0);
		shape.lineTo(0, height);
		shape.closePath();
		const geo = new THREE.ShapeGeometry(shape);
		const mat = getMaterial(roofColor);
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(0, 0, gz);
		mesh.castShadow = true;
		group.add(mesh);
	});

	group.position.set(x, y, z);
	return group;
}

/**
 * Creates a clean Hipped Roof (4-faced pyramid/trapezoid slope)
 */
function createHippedRoof(width, height, depth, color, x = 0, y = 0, z = 0) {
	const group = new THREE.Group();
	const hw = width / 2;
	const hd = depth / 2;

	// Four triangular/trapezoid slopes meeting at ridge
	const ridgeLen = Math.max(0.05, Math.abs(depth - width));
	const isWide = width >= depth;

	if (isWide) {
		const halfRidge = ridgeLen / 2;
		// Front & Back slopes
		const slopeLenZ = Math.hypot(hd, height);
		const angleX = Math.atan2(height, hd);

		const frontSlope = createBox(width + 0.04, 0.025, slopeLenZ, color);
		frontSlope.rotation.x = angleX;
		frontSlope.position.set(0, height / 2, hd / 2);
		group.add(frontSlope);

		const backSlope = createBox(width + 0.04, 0.025, slopeLenZ, color);
		backSlope.rotation.x = -angleX;
		backSlope.position.set(0, height / 2, -hd / 2);
		group.add(backSlope);

		// Ridge cap
		const ridge = createBox(ridgeLen, 0.04, 0.04, color);
		ridge.position.set(0, height, 0);
		group.add(ridge);
	} else {
		// Slopes along Z
		const slopeLenX = Math.hypot(hw, height);
		const angleZ = Math.atan2(height, hw);

		const leftSlope = createBox(slopeLenX, 0.025, depth + 0.04, color);
		leftSlope.rotation.z = angleZ;
		leftSlope.position.set(-hw / 2, height / 2, 0);
		group.add(leftSlope);

		const rightSlope = createBox(slopeLenX, 0.025, depth + 0.04, color);
		rightSlope.rotation.z = -angleZ;
		rightSlope.position.set(hw / 2, height / 2, 0);
		group.add(rightSlope);

		const ridge = createBox(0.04, 0.04, ridgeLen, color);
		ridge.position.set(0, height, 0);
		group.add(ridge);
	}

	group.position.set(x, y, z);
	return group;
}

// -------------------------------------------------------------
// BUILDING MODEL BUILDERS
// -------------------------------------------------------------

/** 1. BOREHOLE (Water) */
function buildBorehole() {
	const group = new THREE.Group();
	// Concrete washing pad / apron with drainage lip
	group.add(createBox(0.85, 0.08, 0.85, COLORS.concrete, 0, 0, 0));
	group.add(createBox(0.75, 0.03, 0.75, COLORS.concreteDark, 0, 0.08, 0));
	// Drainage canal
	group.add(createBox(0.12, 0.02, 0.45, 0x475569, 0.28, 0.08, 0));
	// Water puddle splash
	group.add(createBox(0.35, 0.01, 0.35, COLORS.waterLight, 0.05, 0.11, 0.05));

	// Cast iron hand pump pedestal & barrel
	group.add(createCylinder(0.06, 0.08, 0.42, 8, COLORS.waterBlue, -0.12, 0.1, 0));
	group.add(createBox(0.12, 0.1, 0.12, 0x0284c7, -0.12, 0.52, 0));

	// Pump handle with pivot and wooden grip
	const handle = createBox(0.38, 0.03, 0.03, COLORS.hazardBlack, 0.06, 0.55, 0);
	handle.rotation.z = -0.28;
	group.add(handle);
	group.add(createCylinder(0.02, 0.02, 0.08, 6, COLORS.wood, 0.22, 0.48, 0));

	// Pump spout
	group.add(createBox(0.16, 0.04, 0.04, COLORS.waterBlue, -0.22, 0.44, 0));
	// Blue bucket catching water
	group.add(createCylinder(0.07, 0.05, 0.12, 8, COLORS.waterBlue, -0.25, 0.11, 0));

	// Array of 4 colorful 20L Jerrycans on apron (Yellow, Blue, Green)
	const cans = [
		{ x: 0.16, z: -0.2, c: COLORS.hazardYellow },
		{ x: 0.26, z: -0.1, c: COLORS.waterBlue },
		{ x: 0.2, z: 0.16, c: COLORS.schoolGreen },
		{ x: 0.08, z: 0.24, c: COLORS.hazardYellow }
	];
	cans.forEach(({ x, z, c }) => {
		group.add(createBox(0.11, 0.16, 0.09, c, x, 0.11, z));
		// Cap
		group.add(createBox(0.03, 0.02, 0.03, 0xffffff, x, 0.27, z));
	});

	// Signpost: "COMMUNITY BOREHOLE"
	group.add(createBox(0.02, 0.35, 0.02, COLORS.wood, -0.32, 0.1, -0.3));
	group.add(createBox(0.2, 0.08, 0.02, 0xffffff, -0.32, 0.4, -0.3));
	return group;
}

/** 2. WATER WORKS (Water) */
function buildWaterWorks() {
	const group = new THREE.Group();
	// Base concrete foundation slab
	group.add(createBox(0.92, 0.08, 0.92, COLORS.concrete, 0, 0, 0));

	// Elevated Water Tower Stanchion (4 lattice steel legs with cross beams)
	const legH = 0.58;
	const legOffsets = [-0.18, 0.18];
	legOffsets.forEach((lx) => {
		legOffsets.forEach((lz) => {
			group.add(createBox(0.035, legH, 0.035, COLORS.hazardBlack, lx - 0.16, 0.08, lz));
		});
	});
	// Cross bracings
	group.add(createBox(0.38, 0.02, 0.02, COLORS.concreteDark, -0.16, 0.35, 0.18));
	group.add(createBox(0.38, 0.02, 0.02, COLORS.concreteDark, -0.16, 0.35, -0.18));

	// Water tower main reservoir (Sky blue cylinder with conical roof)
	const tankY = 0.08 + legH;
	group.add(createCylinder(0.25, 0.25, 0.36, 12, COLORS.waterBlue, -0.16, tankY, 0));
	group.add(createCone(0.27, 0.12, 12, COLORS.waterLight, -0.16, tankY + 0.36, 0));
	// Safety ladder
	group.add(createBox(0.04, legH + 0.36, 0.015, 0xffffff, -0.38, 0.08, 0));

	// Pump House control building
	group.add(createBox(0.38, 0.34, 0.52, COLORS.concreteDark, 0.22, 0.08, 0));
	group.add(createGableRoof(0.42, 0.12, 0.56, COLORS.metalRoof, 0x64748b, 0.22, 0.42, 0));

	// Dual filtration tanks
	group.add(createCylinder(0.11, 0.11, 0.22, 10, COLORS.waterLight, 0.18, 0.08, 0.3));
	group.add(createCylinder(0.11, 0.11, 0.22, 10, COLORS.waterLight, -0.16, 0.08, 0.3));

	// Pipe manifolds
	group.add(createBox(0.38, 0.035, 0.035, COLORS.waterBlue, 0.02, 0.2, 0.3));
	group.add(createCylinder(0.025, 0.025, legH, 6, COLORS.waterBlue, -0.16, 0.08, 0));
	return group;
}

/** 3. SOLAR MINI-GRID (Power) */
function buildSolarMiniGrid() {
	const group = new THREE.Group();
	// Gravel ground slab
	group.add(createBox(0.9, 0.05, 0.9, COLORS.concreteBase, 0, 0, 0));

	// 3 rows of angled high-efficiency solar panel arrays
	const rows = [-0.25, 0.02, 0.28];
	rows.forEach((rz) => {
		// Frame stands
		group.add(createBox(0.74, 0.12, 0.03, COLORS.concreteDark, 0, 0.05, rz - 0.06));
		group.add(createBox(0.74, 0.2, 0.03, COLORS.concreteDark, 0, 0.05, rz + 0.06));
		// Photovoltaic panel array
		const panel = createBox(0.74, 0.025, 0.22, COLORS.solarBlue, 0, 0.18, rz);
		panel.rotation.x = -0.32;
		group.add(panel);
		// Silver border trim
		const trim = createBox(0.75, 0.015, 0.015, 0xffffff, 0, 0.22, rz + 0.08);
		group.add(trim);
	});

	// Inverter & Battery storage container with heat vent
	group.add(createBox(0.24, 0.28, 0.18, 0xf8fafc, 0.3, 0.05, -0.3));
	group.add(createBox(0.25, 0.02, 0.19, COLORS.metalRoof, 0.3, 0.33, -0.3));
	// Danger high voltage badge
	group.add(createBox(0.06, 0.05, 0.02, COLORS.hazardYellow, 0.3, 0.22, -0.2));

	// Chainlink perimeter fence posts
	const posts = [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]];
	posts.forEach(([px, pz]) => {
		group.add(createBox(0.025, 0.32, 0.025, COLORS.hazardBlack, px, 0.05, pz));
	});
	return group;
}

/** 4. TRANSFORMER (Power) */
function buildTransformer() {
	const group = new THREE.Group();
	// Concrete plinth
	group.add(createBox(0.8, 0.1, 0.8, COLORS.concrete, 0, 0, 0));
	// Heavy duty transformer housing (Yellow)
	group.add(createBox(0.44, 0.48, 0.4, COLORS.transformerYellow, 0, 0.1, 0));

	// Cooling radiator fins on both sides
	for (let i = -0.16; i <= 0.16; i += 0.07) {
		group.add(createBox(0.48, 0.36, 0.02, 0xca8a04, 0, 0.15, i));
	}

	// Ceramic top insulators
	[-0.12, 0, 0.12].forEach((bx) => {
		group.add(createCylinder(0.02, 0.045, 0.16, 8, 0xd97706, bx, 0.58, 0));
		group.add(createBox(0.015, 0.06, 0.015, COLORS.hazardBlack, bx, 0.72, 0));
	});

	// Steel safety perimeter cage
	group.add(createBox(0.72, 0.4, 0.02, COLORS.hazardBlack, 0, 0.1, -0.34));
	group.add(createBox(0.72, 0.4, 0.02, COLORS.hazardBlack, 0, 0.1, 0.34));
	group.add(createBox(0.02, 0.4, 0.68, COLORS.hazardBlack, -0.34, 0.1, 0));
	group.add(createBox(0.02, 0.4, 0.68, COLORS.hazardBlack, 0.34, 0.1, 0));

	// Danger warning decal board
	group.add(createBox(0.16, 0.12, 0.02, COLORS.hazardYellow, 0, 0.3, 0.36));
	group.add(createBox(0.06, 0.06, 0.025, 0xdc2626, 0, 0.3, 0.36));
	return group;
}

/** 5. PRIMARY SCHOOL (Education) - Authentic Nigerian Public Primary School */
function buildPrimarySchool() {
	const group = new THREE.Group();

	// School compound ground (Sandy laterite soil)
	group.add(createBox(0.92, 0.04, 0.92, 0xd97706, 0, 0, 0));

	// Compound perimeter curb
	group.add(createBox(0.92, 0.06, 0.03, COLORS.concreteDark, 0, 0.04, -0.45));
	group.add(createBox(0.92, 0.06, 0.03, COLORS.concreteDark, 0, 0.04, 0.45));
	group.add(createBox(0.03, 0.06, 0.9, COLORS.concreteDark, -0.45, 0.04, 0));
	group.add(createBox(0.03, 0.06, 0.9, COLORS.concreteDark, 0.45, 0.04, 0));

	// Main classroom block positioned at the back
	const blockW = 0.82;
	const blockD = 0.36;
	const blockH = 0.28;
	const blockZ = -0.22;

	// Dark green wainscot plinth
	group.add(createBox(blockW, 0.08, blockD, COLORS.schoolGreenDark, 0, 0.04, blockZ));
	// Upper walls (Cream ochre)
	group.add(createBox(blockW, blockH - 0.08, blockD, COLORS.schoolCream, 0, 0.12, blockZ));

	// REAL PITCHED GABLE ROOF with overhanging eaves & ridge cap
	group.add(
		createGableRoof(
			blockW + 0.08,
			0.18,
			blockD + 0.08,
			COLORS.schoolGreen,
			COLORS.schoolGreenDark,
			0,
			0.04 + blockH,
			blockZ
		)
	);

	// Covered front veranda walkway
	const verandaW = blockW;
	const verandaD = 0.12;
	const verandaZ = blockZ + blockD / 2 + verandaD / 2;
	group.add(createBox(verandaW, 0.05, verandaD, COLORS.concrete, 0, 0.04, verandaZ));

	// 5 White concrete veranda pillars
	const numPillars = 5;
	for (let i = 0; i < numPillars; i++) {
		const px = -blockW / 2 + 0.05 + (i / (numPillars - 1)) * (blockW - 0.1);
		group.add(createBox(0.035, 0.24, 0.035, 0xffffff, px, 0.09, verandaZ + verandaD / 2 - 0.02));
	}

	// Classroom wooden doors with white architraves
	[-0.24, 0.08].forEach((dx) => {
		group.add(createBox(0.08, 0.18, 0.02, COLORS.wood, dx, 0.08, blockZ + blockD / 2 + 0.01));
		group.add(createBox(0.015, 0.015, 0.025, 0xffffff, dx + 0.025, 0.16, blockZ + blockD / 2 + 0.01));
	});

	// Louvered windows with blue glass panes & white frames
	[-0.34, -0.12, 0.22, 0.32].forEach((wx) => {
		group.add(createBox(0.09, 0.1, 0.02, 0x38bdf8, wx, 0.16, blockZ + blockD / 2 + 0.01));
		group.add(createBox(0.1, 0.015, 0.025, 0xffffff, wx, 0.11, blockZ + blockD / 2 + 0.01));
	});

	// Classroom blackboard mounted on veranda wall
	group.add(createBox(0.14, 0.09, 0.015, COLORS.hazardBlack, -0.02, 0.15, blockZ + blockD / 2 + 0.01));

	// AUTHENTIC NIGERIAN FLAGPOLE (Front Left)
	const flagX = -0.26;
	const flagZ = 0.22;
	// Tall white flagpole
	group.add(createCylinder(0.015, 0.02, 0.72, 8, 0xffffff, flagX, 0.04, flagZ));
	// Gold top ball finial
	group.add(createCylinder(0.03, 0.03, 0.04, 8, 0xfacc15, flagX, 0.76, flagZ));
	// 3-Stripe Nigerian Flag (Green - White - Green)
	const flagH = 0.11;
	const flagW = 0.07;
	const flagY = 0.64;
	group.add(createBox(flagW, flagH, 0.01, COLORS.schoolGreen, flagX + flagW / 2 + 0.01, flagY, flagZ));
	group.add(createBox(flagW, flagH, 0.01, 0xffffff, flagX + flagW * 1.5 + 0.01, flagY, flagZ));
	group.add(createBox(flagW, flagH, 0.01, COLORS.schoolGreen, flagX + flagW * 2.5 + 0.01, flagY, flagZ));

	// SCHOOL BELL on timber A-frame stand (Front Right)
	const bellX = 0.28;
	const bellZ = 0.18;
	const leg1 = createBox(0.03, 0.32, 0.03, COLORS.wood, bellX - 0.05, 0.04, bellZ);
	leg1.rotation.z = -0.2;
	const leg2 = createBox(0.03, 0.32, 0.03, COLORS.wood, bellX + 0.05, 0.04, bellZ);
	leg2.rotation.z = 0.2;
	group.add(leg1);
	group.add(leg2);
	group.add(createBox(0.14, 0.025, 0.03, COLORS.wood, bellX, 0.32, bellZ));
	// Golden Bell
	group.add(createCylinder(0.02, 0.05, 0.07, 8, 0xfacc15, bellX, 0.24, bellZ));

	// Mini football goalpost on assembly ground
	const goalX = 0.08;
	const goalZ = 0.32;
	group.add(createBox(0.24, 0.02, 0.02, 0xffffff, goalX, 0.12, goalZ));
	group.add(createBox(0.02, 0.1, 0.02, 0xffffff, goalX - 0.11, 0.04, goalZ));
	group.add(createBox(0.02, 0.1, 0.02, 0xffffff, goalX + 0.11, 0.04, goalZ));

	return group;
}

/** 6. CLINIC (Health) - Primary Healthcare Centre */
function buildClinic() {
	const group = new THREE.Group();
	// Base foundation
	group.add(createBox(0.88, 0.06, 0.88, COLORS.concrete, 0, 0, 0));

	// Main clinic bungalow (Clean White Sandcrete)
	const clinicW = 0.62;
	const clinicD = 0.52;
	const clinicH = 0.32;
	group.add(createBox(clinicW, clinicH, clinicD, COLORS.clinicWhite, -0.06, 0.06, 0));

	// Green Hipped Roof
	group.add(createHippedRoof(clinicW + 0.06, 0.18, clinicD + 0.06, COLORS.clinicGreen, -0.06, 0.06 + clinicH, 0));

	// Red Cross Medical Insignia on front facade
	group.add(createBox(0.045, 0.14, 0.02, 0xdc2626, -0.06, 0.22, 0.27));
	group.add(createBox(0.14, 0.045, 0.02, 0xdc2626, -0.06, 0.22, 0.27));

	// Louvered windows with blue glass
	[-0.26, 0.14].forEach((wx) => {
		group.add(createBox(0.08, 0.1, 0.02, 0x38bdf8, wx, 0.18, 0.27));
		group.add(createBox(0.09, 0.015, 0.025, 0xffffff, wx, 0.13, 0.27));
	});

	// Ambulance portico / awning (Right side)
	group.add(createBox(0.26, 0.03, 0.36, COLORS.concreteDark, 0.28, 0.26, 0.05));
	group.add(createBox(0.03, 0.2, 0.03, COLORS.hazardBlack, 0.38, 0.06, 0.2));

	// Parked tricycle / mini-ambulance
	group.add(createBox(0.15, 0.12, 0.22, COLORS.clinicGreen, 0.26, 0.06, 0.05));
	group.add(createBox(0.04, 0.03, 0.04, 0xdc2626, 0.26, 0.18, 0.05));
	return group;
}

/** 7. GENERAL HOSPITAL (Health) */
function buildHospital() {
	const group = new THREE.Group();
	// Polished concrete plaza
	group.add(createBox(0.92, 0.06, 0.92, COLORS.concrete, 0, 0, 0));

	// Central 3-story hospital main block
	group.add(createBox(0.58, 0.74, 0.48, COLORS.hospitalWhite, 0, 0.06, -0.06));
	// Side emergency wing
	group.add(createBox(0.3, 0.4, 0.36, COLORS.clinicWhite, -0.3, 0.06, 0.1));

	// Glass curtain wall entrance
	group.add(createBox(0.34, 0.3, 0.03, COLORS.hospitalGlass, 0, 0.06, 0.185));

	// Rooftop Helipad & AC Chiller plant
	group.add(createBox(0.4, 0.04, 0.4, COLORS.concreteDark, 0, 0.8, -0.06));
	group.add(createCylinder(0.14, 0.14, 0.02, 12, COLORS.hazardYellow, 0, 0.84, -0.06));
	// 'H' marking on helipad
	group.add(createBox(0.02, 0.005, 0.12, 0xdc2626, -0.04, 0.855, -0.06));
	group.add(createBox(0.02, 0.005, 0.12, 0xdc2626, 0.04, 0.855, -0.06));
	group.add(createBox(0.08, 0.005, 0.02, 0xdc2626, 0, 0.855, -0.06));

	// Prominent Red Cross beacon on facade
	group.add(createBox(0.05, 0.18, 0.02, 0xdc2626, 0, 0.64, 0.185));
	group.add(createBox(0.18, 0.05, 0.02, 0xdc2626, 0, 0.64, 0.185));

	// Ambulance bay awning
	group.add(createBox(0.32, 0.03, 0.28, COLORS.concreteDark, 0.26, 0.22, 0.2));
	group.add(createBox(0.025, 0.16, 0.025, COLORS.concreteDark, 0.39, 0.06, 0.32));

	// White ambulance van
	group.add(createBox(0.15, 0.13, 0.24, COLORS.hospitalWhite, 0.26, 0.06, 0.2));
	group.add(createBox(0.05, 0.035, 0.05, 0xdc2626, 0.26, 0.19, 0.2));
	return group;
}

/** 8. ROAD (Roads) */
function buildRoad(connections = { north: true, south: true, east: false, west: false }) {
	const group = new THREE.Group();
	// Road asphalt bed
	group.add(createBox(0.98, 0.05, 0.98, 0x334155, 0, 0, 0));

	// Raised curbs on non-connected sides
	if (!connections.north) group.add(createBox(0.98, 0.08, 0.14, COLORS.concreteDark, 0, 0.05, -0.42));
	if (!connections.south) group.add(createBox(0.98, 0.08, 0.14, COLORS.concreteDark, 0, 0.05, 0.42));
	if (!connections.west) group.add(createBox(0.14, 0.08, 0.98, COLORS.concreteDark, -0.42, 0.05, 0));
	if (!connections.east) group.add(createBox(0.14, 0.08, 0.98, COLORS.concreteDark, 0.42, 0.05, 0));

	// Yellow/white road center dashes
	if (connections.north || connections.south) {
		group.add(createBox(0.04, 0.005, 0.35, 0xfef08a, 0, 0.055, -0.25));
		group.add(createBox(0.04, 0.005, 0.35, 0xfef08a, 0, 0.055, 0.25));
	}
	if (connections.east || connections.west) {
		group.add(createBox(0.35, 0.005, 0.04, 0xfef08a, -0.25, 0.055, 0));
		group.add(createBox(0.35, 0.005, 0.04, 0xfef08a, 0.25, 0.055, 0));
	}
	if (!connections.north && !connections.south && !connections.east && !connections.west) {
		group.add(createBox(0.04, 0.005, 0.4, 0xfef08a, 0, 0.055, 0));
	}

	// Streetlamp
	group.add(createCylinder(0.015, 0.02, 0.48, 6, COLORS.hazardBlack, 0.4, 0.05, 0.35));
	group.add(createBox(0.06, 0.02, 0.04, 0xfef08a, 0.36, 0.51, 0.35));
	return group;
}

/** 9. POLICE POST (Security) - Nigerian Police Divisional Post */
function buildPolicePost() {
	const group = new THREE.Group();
	// Base concrete slab
	group.add(createBox(0.88, 0.06, 0.88, COLORS.concrete, 0, 0, 0));

	// Main police station block
	const stationW = 0.58;
	const stationD = 0.48;
	const stationH = 0.34;
	group.add(createBox(stationW, stationH, stationD, COLORS.policeBlue, -0.06, 0.06, -0.06));

	// Iconic Nigerian Police Stripes on front wall (Yellow & Black horizontal band)
	group.add(createBox(stationW + 0.01, 0.05, 0.02, COLORS.policeYellow, -0.06, 0.25, 0.185));
	group.add(createBox(stationW + 0.01, 0.05, 0.02, COLORS.hazardBlack, -0.06, 0.19, 0.185));

	// Metal corrugated roof
	group.add(createGableRoof(stationW + 0.06, 0.14, stationD + 0.06, COLORS.metalRoof, 0x64748b, -0.06, 0.06 + stationH, -0.06));

	// Tall Communications Mast / Radio Antenna Tower
	group.add(createCylinder(0.012, 0.025, 0.92, 6, 0xdc2626, 0.32, 0.06, -0.28));
	group.add(createBox(0.08, 0.05, 0.02, COLORS.concrete, 0.32, 0.88, -0.28));

	// Sandbag perimeter bunker / check-point
	group.add(createBox(0.32, 0.14, 0.12, 0xb45309, 0.18, 0.06, 0.28));
	// Red/White barrier boom gate
	const barrier = createBox(0.36, 0.025, 0.025, 0xdc2626, -0.16, 0.12, 0.32);
	group.add(barrier);
	return group;
}

/** 10. HOUSING ESTATE (Housing) */
function buildHousingEstate() {
	const group = new THREE.Group();
	// Compound sand ground
	group.add(createBox(0.9, 0.04, 0.9, COLORS.housingWall, 0, 0, 0));

	// Perimeter sandcrete compound wall
	group.add(createBox(0.88, 0.16, 0.03, COLORS.concreteDark, 0, 0.04, -0.43));
	group.add(createBox(0.88, 0.16, 0.03, COLORS.concreteDark, 0, 0.04, 0.43));
	group.add(createBox(0.03, 0.16, 0.84, COLORS.concreteDark, -0.43, 0.04, 0));
	group.add(createBox(0.03, 0.16, 0.84, COLORS.concreteDark, 0.43, 0.04, 0));

	// 2 Bungalows with Terracotta hipped roofs
	const houses = [
		{ x: -0.18, z: -0.18, scale: 1 },
		{ x: 0.18, z: 0.18, scale: 0.92 }
	];
	houses.forEach(({ x, z, scale }) => {
		const hw = 0.34 * scale;
		const hd = 0.32 * scale;
		const hh = 0.25 * scale;
		group.add(createBox(hw, hh, hd, 0xfffbeb, x, 0.04, z));
		group.add(createHippedRoof(hw + 0.06, 0.16 * scale, hd + 0.06, COLORS.housingTerracotta, x, 0.04 + hh, z));
		// Windows
		group.add(createBox(0.08, 0.08, 0.02, 0x38bdf8, x, 0.16, z + hd / 2 + 0.005));
	});

	// Overhead GeePee Black water tank on steel stanchion
	group.add(createBox(0.035, 0.38, 0.035, COLORS.hazardBlack, -0.28, 0.04, 0.28));
	group.add(createCylinder(0.09, 0.09, 0.16, 10, COLORS.hazardBlack, -0.28, 0.42, 0.28));
	return group;
}

/** 11. MARKET (Jobs) */
function buildMarket() {
	const group = new THREE.Group();
	// Dusty red laterite earth floor
	group.add(createBox(0.9, 0.04, 0.9, 0xb45309, 0, 0, 0));

	// 4 open-air market stall tables with colorful umbrellas
	const stalls = [
		{ x: -0.24, z: -0.24, color: COLORS.marketTarpYellow },
		{ x: 0.24, z: -0.22, color: COLORS.marketTarpBlue },
		{ x: -0.22, z: 0.24, color: COLORS.marketTarpGreen },
		{ x: 0.24, z: 0.24, color: COLORS.marketTarpRed }
	];
	stalls.forEach(({ x, z, color }) => {
		// Vendor table
		group.add(createBox(0.22, 0.08, 0.18, COLORS.marketWood, x, 0.04, z));
		// Produce crates (oranges / tomatoes)
		group.add(createBox(0.08, 0.06, 0.08, 0xf97316, x - 0.04, 0.12, z));
		group.add(createBox(0.07, 0.05, 0.07, 0xdc2626, x + 0.04, 0.12, z));
		// Umbrella pole
		group.add(createCylinder(0.012, 0.015, 0.34, 6, COLORS.hazardBlack, x, 0.04, z));
		// Umbrella canopy (hexagonal cone)
		group.add(createCone(0.2, 0.1, 6, color, x, 0.34, z));
	});

	// Central lockup market master / levy office
	group.add(createBox(0.2, 0.24, 0.2, COLORS.concreteDark, 0, 0.04, 0));
	group.add(createGableRoof(0.24, 0.08, 0.24, COLORS.metalRoof, 0x64748b, 0, 0.28, 0));
	return group;
}

/** 12. BUSINESS HUB (Jobs) - SME Commercial Plaza */
function buildBusinessHub() {
	const group = new THREE.Group();
	// Paved forecourt
	group.add(createBox(0.92, 0.06, 0.92, COLORS.concrete, 0, 0, 0));

	// Main 2-story commercial shopping complex
	const hubW = 0.76;
	const hubH = 0.54;
	const hubD = 0.64;
	group.add(createBox(hubW, hubH, hubD, COLORS.businessFrame, 0, 0.06, -0.04));

	// Glazed shopfront windows on ground floor
	group.add(createBox(0.7, 0.18, 0.02, COLORS.businessGlass, 0, 0.1, 0.285));
	// Upper floor office windows
	group.add(createBox(0.7, 0.16, 0.02, COLORS.businessGlass, 0, 0.36, 0.285));

	// Corporate signboard
	group.add(createBox(0.76, 0.09, 0.03, COLORS.hazardYellow, 0, 0.52, 0.285));

	// Rooftop backup diesel generator shed with exhaust
	group.add(createBox(0.24, 0.16, 0.2, COLORS.concreteDark, -0.2, 0.6, -0.1));
	group.add(createCylinder(0.015, 0.015, 0.2, 6, COLORS.hazardBlack, -0.28, 0.68, -0.1));

	// AC compressor units on roof
	group.add(createBox(0.12, 0.1, 0.1, 0x64748b, 0.18, 0.6, 0.05));
	group.add(createBox(0.12, 0.1, 0.1, 0x64748b, 0.18, 0.6, -0.18));
	return group;
}

/** 13. WASTE DEPOT (Sanitation) */
function buildWasteDepot() {
	const group = new THREE.Group();
	// Concrete apron
	group.add(createBox(0.9, 0.05, 0.9, 0x52525b, 0, 0, 0));

	// Concrete retaining perimeter walls
	group.add(createBox(0.88, 0.2, 0.04, COLORS.concreteBase, 0, 0.05, -0.42));
	group.add(createBox(0.04, 0.2, 0.84, COLORS.concreteBase, -0.42, 0.05, 0));
	group.add(createBox(0.04, 0.2, 0.84, COLORS.concreteBase, 0.42, 0.05, 0));

	// Green Municipal Waste Skip Bins
	group.add(createBox(0.24, 0.18, 0.34, COLORS.wasteGreen, -0.18, 0.05, -0.15));
	group.add(createBox(0.24, 0.18, 0.34, COLORS.wasteGreen, -0.18, 0.05, 0.18));

	// Refuse / recycling mound
	group.add(createCone(0.22, 0.16, 8, COLORS.wasteTrash, 0.18, 0.05, -0.18));

	// Waste Compactor / Sanitation truck
	group.add(createBox(0.2, 0.18, 0.38, COLORS.hazardYellow, 0.18, 0.05, 0.15));
	group.add(createBox(0.2, 0.14, 0.14, COLORS.hazardBlack, 0.18, 0.05, 0.33));
	// Orange beacon
	group.add(createBox(0.04, 0.03, 0.04, 0xf97316, 0.18, 0.23, 0.33));
	return group;
}

/** UNDER CONSTRUCTION SITE (Used for any building with turnsLeft > 0) */
function buildUnderConstructionSite() {
	const group = new THREE.Group();
	// Exposed foundation concrete slab
	group.add(createBox(0.86, 0.06, 0.86, COLORS.concreteDark, 0, 0, 0));

	// Rising rebar columns
	const rebarOffsets = [-0.26, 0, 0.26];
	rebarOffsets.forEach((rx) => {
		rebarOffsets.forEach((rz) => {
			group.add(createBox(0.025, 0.38, 0.025, 0x78716c, rx, 0.06, rz));
		});
	});

	// Wooden scaffolding towers
	group.add(createBox(0.035, 0.54, 0.035, COLORS.wood, -0.34, 0.06, -0.34));
	group.add(createBox(0.035, 0.54, 0.035, COLORS.wood, 0.34, 0.06, -0.34));
	group.add(createBox(0.035, 0.54, 0.035, COLORS.wood, -0.34, 0.06, 0.34));
	group.add(createBox(0.035, 0.54, 0.035, COLORS.wood, 0.34, 0.06, 0.34));
	// Scaffolding walkways & cross braces
	group.add(createBox(0.68, 0.025, 0.025, COLORS.wood, 0, 0.32, -0.34));
	group.add(createBox(0.68, 0.025, 0.025, COLORS.wood, 0, 0.32, 0.34));

	// Yellow mini construction hoist / crane
	group.add(createCylinder(0.025, 0.035, 0.72, 8, COLORS.hazardYellow, 0, 0.06, 0));
	const jib = createBox(0.6, 0.04, 0.04, COLORS.hazardYellow, 0.16, 0.76, 0);
	group.add(jib);
	// Hoist cable & hook
	group.add(createBox(0.01, 0.25, 0.01, COLORS.hazardBlack, 0.38, 0.54, 0));

	// Yellow/Black Hazard Notice Board
	group.add(createBox(0.28, 0.18, 0.02, COLORS.hazardYellow, -0.22, 0.1, 0.36));
	group.add(createBox(0.24, 0.035, 0.025, COLORS.hazardBlack, -0.22, 0.15, 0.36));
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
