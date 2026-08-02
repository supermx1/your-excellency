// @ts-nocheck
import { tileTypes } from './rulebook.js';

/**
 * @typedef {{
 *   id: string, label: string, blurb: string, sector: string,
 *   cost: number, maintenance: number, capacity: number, igr: number, buildTurns: number,
 *   terrainModifiers: { [tileType: string]: { costMult?: number, effectMult?: number } },
 *   requiresRoadAdjacent: boolean,
 *   adjacencyBonuses: { near: string, withinTiles: number, effectMult: number, required?: boolean, description: string }[],
 *   secondaryEffects: { [sector: string]: number }
 * }} Building
 */

// The 13-building catalog. `capacity` is the sector-supply units the building
// contributes at full effect (before terrain/adjacency modifiers); `igr` is
// naira/turn revenue for jobs buildings; `buildTurns` is how many turns the site
// spends under construction before it produces anything — the cost is paid up
// front, so a hospital is a five-turn bet on the rest of your term.
// `secondaryEffects` are small bonus contributions to a sector other than the
// building's own (e.g. roads help sanitation via drainage).
/** @type {{ [id: string]: Building }} */
export const buildingCatalog = {
	borehole: {
		id: 'borehole',
		label: 'Borehole',
		blurb: 'A hand-pump borehole. Cheap, fast, thirsty crowd guaranteed.',
		sector: 'water',
		cost: 1200000,
		maintenance: 25000,
		capacity: 600,
		igr: 0,
		buildTurns: 1,
		terrainModifiers: {
			riverside: { costMult: 0.55, effectMult: 1.5 },
			farmland: { effectMult: 1.1 },
			slum: { effectMult: 0.9 }
		},
		requiresRoadAdjacent: false,
		adjacencyBonuses: [],
		secondaryEffects: {}
	},
	water_works: {
		id: 'water_works',
		label: 'Water Works',
		blurb: 'A piped treatment plant. Expensive, but it serves the whole ward.',
		sector: 'water',
		cost: 6000000,
		maintenance: 150000,
		capacity: 3000,
		igr: 0,
		buildTurns: 4,
		terrainModifiers: {
			riverside: { costMult: 0.75, effectMult: 1.35 },
			town_centre: { costMult: 1.15 }
		},
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: {}
	},
	solar_minigrid: {
		id: 'solar_minigrid',
		label: 'Solar Mini-Grid',
		blurb: 'Panels and batteries on their own patch of land. Generates power outright.',
		sector: 'power',
		cost: 5500000,
		maintenance: 140000,
		capacity: 2500,
		igr: 0,
		buildTurns: 3,
		terrainModifiers: {
			farmland: { effectMult: 1.15 },
			scrub: { effectMult: 1.1 },
			town_centre: { costMult: 1.2 }
		},
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: {}
	},
	transformer: {
		id: 'transformer',
		label: 'Transformer',
		blurb:
			"Steps down power for the neighbourhood — dead weight unless it's within reach of a source.",
		sector: 'power',
		cost: 2000000,
		maintenance: 50000,
		capacity: 1500,
		igr: 0,
		buildTurns: 1,
		terrainModifiers: { town_centre: { costMult: 1.2 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [
			{
				near: 'solar_minigrid',
				withinTiles: 2,
				effectMult: 1,
				required: true,
				description: 'Needs a Solar Mini-Grid within 2 tiles to carry any load at all.'
			}
		],
		secondaryEffects: {}
	},
	primary_school: {
		id: 'primary_school',
		label: 'Primary School',
		blurb: 'Six classrooms and a borehole out back, if you are lucky.',
		sector: 'education',
		cost: 4500000,
		maintenance: 110000,
		capacity: 1500,
		igr: 0,
		buildTurns: 3,
		terrainModifiers: { slum: { costMult: 0.85 }, farmland: { effectMult: 1.05 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [
			{
				near: 'housing_estate',
				withinTiles: 2,
				effectMult: 1.2,
				required: false,
				description: 'Families with children move in when a school sits near an estate.'
			}
		],
		secondaryEffects: {}
	},
	clinic: {
		id: 'clinic',
		label: 'Clinic',
		blurb: 'A primary health centre. Small, but it stops the bleeding.',
		sector: 'health',
		cost: 3000000,
		maintenance: 75000,
		capacity: 900,
		igr: 0,
		buildTurns: 2,
		terrainModifiers: { slum: { costMult: 0.85, effectMult: 1.1 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: { sanitation: 60 }
	},
	hospital: {
		id: 'hospital',
		label: 'General Hospital',
		blurb: 'Wards, a theatre, an ambulance bay. A real hospital, if the budget survives it.',
		sector: 'health',
		cost: 12000000,
		maintenance: 300000,
		capacity: 3000,
		igr: 0,
		buildTurns: 5,
		terrainModifiers: { town_centre: { effectMult: 1.1 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: { sanitation: 150 }
	},
	road: {
		id: 'road',
		label: 'Road',
		blurb: 'Tarred access. Everything else works better once this is next door.',
		sector: 'roads',
		cost: 400000,
		maintenance: 10000,
		capacity: 400,
		igr: 0,
		buildTurns: 1,
		terrainModifiers: {
			riverside: { costMult: 1.4 },
			farmland: { costMult: 0.85 },
			town_centre: { costMult: 1.3 }
		},
		requiresRoadAdjacent: false,
		adjacencyBonuses: [],
		secondaryEffects: { sanitation: 35 }
	},
	police_post: {
		id: 'police_post',
		label: 'Police Post',
		blurb: 'A divisional outpost. Presence more than firepower.',
		sector: 'security',
		cost: 3200000,
		maintenance: 80000,
		capacity: 1200,
		igr: 0,
		buildTurns: 2,
		terrainModifiers: { slum: { effectMult: 1.15 }, town_centre: { costMult: 1.15 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: {}
	},
	housing_estate: {
		id: 'housing_estate',
		label: 'Housing Estate',
		blurb: 'Rows of two-bedroom bungalows. Where the population growth actually comes from.',
		sector: 'housing',
		cost: 5500000,
		maintenance: 140000,
		capacity: 2000,
		igr: 0,
		buildTurns: 3,
		terrainModifiers: {
			farmland: { costMult: 0.85 },
			slum: { costMult: 0.7, effectMult: 0.9 },
			town_centre: { costMult: 1.35 }
		},
		requiresRoadAdjacent: true,
		adjacencyBonuses: [],
		secondaryEffects: {}
	},
	market: {
		id: 'market',
		label: 'Market',
		blurb: 'Open-air stalls and a levy office. Small, steady internally generated revenue.',
		sector: 'jobs',
		cost: 2500000,
		maintenance: 60000,
		capacity: 700,
		igr: 400000,
		buildTurns: 2,
		terrainModifiers: {
			town_centre: { costMult: 1.2, effectMult: 1.2 },
			slum: { costMult: 0.8 }
		},
		requiresRoadAdjacent: true,
		adjacencyBonuses: [
			{
				near: 'housing_estate',
				withinTiles: 2,
				effectMult: 1.15,
				required: false,
				description: 'Foot traffic from nearby estates keeps the stalls busy.'
			}
		],
		secondaryEffects: {}
	},
	business_hub: {
		id: 'business_hub',
		label: 'SME Business Hub',
		blurb: 'Serviced shop units for small businesses. Bigger levy base, bigger price tag.',
		sector: 'jobs',
		cost: 9000000,
		maintenance: 220000,
		capacity: 1800,
		igr: 1100000,
		buildTurns: 4,
		terrainModifiers: { town_centre: { costMult: 1.25, effectMult: 1.25 } },
		requiresRoadAdjacent: true,
		adjacencyBonuses: [
			{
				near: 'housing_estate',
				withinTiles: 2,
				effectMult: 1.1,
				required: false,
				description: 'A residential base nearby means customers and workers alike.'
			}
		],
		secondaryEffects: {}
	},
	waste_depot: {
		id: 'waste_depot',
		label: 'Waste & Drainage Depot',
		blurb: 'Refuse trucks, drainage crews and a dump site nobody wants next door.',
		sector: 'sanitation',
		cost: 3_800_000,
		maintenance: 95_000,
		capacity: 2_200,
		igr: 0,
		buildTurns: 2,
		terrainModifiers: {
			scrub: { costMult: 0.8 },
			farmland: { costMult: 0.9 },
			town_centre: { costMult: 1.3, effectMult: 0.85 },
			riverside: { effectMult: 0.8 }
		},
		requiresRoadAdjacent: true,
		adjacencyBonuses: [
			{
				near: 'housing_estate',
				withinTiles: 1,
				effectMult: 0.85,
				required: false,
				description: 'Sited right beside an estate — residents complain about the smell.'
			}
		],
		secondaryEffects: { health: 120 }
	}
};

/** @param {Building} building @param {string} tileType */
export function computeBuildCost(building, tileType) {
	const landMultiplier = tileTypes[tileType]?.costMultiplier ?? 1;
	const buildingMultiplier = building.terrainModifiers?.[tileType]?.costMult ?? 1;
	return Math.round(building.cost * landMultiplier * buildingMultiplier);
}
