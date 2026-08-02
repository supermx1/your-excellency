// @ts-nocheck

// Terrain tile-type table: land price and flavour per tile. Buildings can layer
// their own per-type cost/effect modifiers on top of `costMultiplier` here
// (see buildings.js `terrainModifiers`).
/** @type {{ [type: string]: { label: string, colorClass: string, fill: string, costMultiplier: number, description: string } }} */
export const tileTypes = {
	town_centre: {
		label: 'Town Centre',
		colorClass: 'bg-amber-300',
		fill: '#fcd34d',
		costMultiplier: 1.4,
		description: 'Prime land near the market square — everything costs more, but footfall is high.'
	},
	residential: {
		label: 'Residential',
		colorClass: 'bg-orange-200',
		fill: '#fed7aa',
		costMultiplier: 1,
		description: 'Ordinary neighbourhood plots.'
	},
	slum: {
		label: 'Slum',
		colorClass: 'bg-stone-400',
		fill: '#a8a29e',
		costMultiplier: 0.7,
		description: 'Cheap land and high need — demand runs hot here.'
	},
	farmland: {
		label: 'Farmland',
		colorClass: 'bg-lime-300',
		fill: '#bef264',
		costMultiplier: 0.85,
		description: 'Open land outside town. Cheap to build on, but a walk from the centre.'
	},
	riverside: {
		label: 'Riverside',
		colorClass: 'bg-sky-300',
		fill: '#7dd3fc',
		costMultiplier: 1.1,
		description: 'Water buildings work better here.'
	},
	scrub: {
		label: 'Scrub',
		colorClass: 'bg-yellow-100',
		fill: '#fef9c3',
		costMultiplier: 0.6,
		description: 'Undeveloped bush. Cheapest land, no bonuses.'
	}
};

export const defaultRulebook = {
	version: 'city-2026-08-02',
	params: {
		turns: 16,
		gridSize: 14,
		startingBudget: 25_000_000,
		startingPopulation: 6_000,

		// --- money ---
		// A fresh tranche lands every turn, scaled by how well the ward is doing:
		// allocationBase * (floor + gain * satisfaction/100). Deliver and the state
		// funds you; let the ward rot and the tap tightens. Frozen during a probe.
		allocationBase: 6_500_000,
		allocationFloor: 0.4,
		allocationGain: 0.85,

		// What the ward already had before you took office — informal housing, a few
		// boreholes, an old clinic. Without this every run starts at a 100% shortfall
		// and satisfaction is mathematically pinned at zero.
		//
		// It rots. Old pumps seize, the clinic loses its nurse, culverts silt up. Without
		// decay a shrinking ward would be *easier* to satisfy, so neglect scored well —
		// this is what makes doing nothing a losing move rather than a safe one.
		legacySupplyDecay: 0.11,
		baseSupply: {
			water: 1_500,
			power: 1_200,
			health: 600,
			education: 900,
			roads: 1_200,
			security: 600,
			jobs: 900,
			housing: 5_000,
			sanitation: 800
		},

		// Adjacency: how far a building can "see" a road and still count as connected.
		roadAdjacencyRadius: 1,
		// Effect multiplier applied to a building's output when it needs a road and doesn't have one.
		reducedEffectMultiplier: 0.45,

		// Population chases the ceiling set by however much housing and how many jobs
		// exist — build housing and work, and people move in. Let satisfaction crater
		// and they leave. This is the growth loop: more people also means more demand.
		populationGrowthRate: 0.12,
		populationDeclineRate: 0.04,
		lowSatisfactionEmigrationThreshold: 28,
		populationFloor: 3_000,

		// Demand per resident, per sector, per turn. Units line up with building `capacity`
		// (roughly "residents served" per sector, except jobs, which is job-slots-per-worker).
		demandPerCapita: {
			water: 1,
			power: 0.9,
			health: 0.5,
			education: 0.6,
			roads: 0.4,
			security: 0.45,
			jobs: 0.4,
			housing: 1,
			sanitation: 0.55
		},

		// How much each sector's shortfall drags satisfaction down.
		satisfactionWeights: {
			water: 0.16,
			power: 0.14,
			health: 0.14,
			education: 0.12,
			roads: 0.1,
			security: 0.12,
			jobs: 0.12,
			housing: 0.06,
			sanitation: 0.04
		},
		// Fraction of the gap to this turn's target satisfaction that closes each turn (smooths swings).
		satisfactionSmoothing: 0.7,

		scrutinyThresholds: { whispers: 20, press: 45, probe: 70, conviction: 95 },
		scrutinyPerNairaEmbezzled: 0.0000009,
		scrutinyMinBump: 3,

		// --- what the stolen money actually buys ---
		// Handouts: cash and party bags. Real satisfaction, right now, that decays
		// fast and fixes nothing — the point of the satire.
		handoutCost: 3_000_000,
		handoutBoost: 9,
		handoutDecay: 0.45,
		handoutScrutiny: 5,
		// Election insurance: buy your way past a bad verdict. Expensive and loud.
		electionInsuranceCost: 18_000_000,
		electionInsuranceScrutiny: 16,
		// Satisfaction needed before scrutiny starts bleeding back down on its own.
		scrutinyDecayThreshold: 65,
		scrutinyDecayPerTurn: 4,

		eventChance: 0.35,

		// Ending score weights: final satisfaction, sector delivery ratio, and integrity.
		endingWeights: { satisfaction: 0.4, delivery: 0.35, integrity: 0.25 }
	}
};
