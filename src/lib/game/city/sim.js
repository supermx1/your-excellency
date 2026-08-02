// @ts-nocheck
import { hashString, rng } from '../engine.js';
import { buildingCatalog } from './buildings.js';
import { defaultRulebook } from './rulebook.js';

/** @param {number} value @param {number} [min] @param {number} [max] */
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
/** @param {number} value */
const round = (value) => Math.round(value);

/** @template T @param {T} value @returns {T} */
function clone(value) {
	// ponytail: JSON round-trip instead of structuredClone — Svelte 5 $state proxies
	// throw DataCloneError in structuredClone; run state is plain JSON anyway.
	return JSON.parse(JSON.stringify(value));
}

/** @param {{ tiles: { x: number, y: number, type: string, buildingId: string|null }[] }} grid @param {number} x @param {number} y */
export function tileAt(grid, x, y) {
	return grid.tiles.find((tile) => tile.x === x && tile.y === y) || null;
}

/** True if any tile within `radius` (Chebyshev, excluding self) has a road. */
export function isRoadAdjacent(grid, x, y, radius) {
	return withinTiles(grid, x, y, radius, (tile) => tile.buildingId === 'road');
}

/** True if any tile within `radius` (excluding self) has the given buildingId. */
export function hasNeighborBuilding(grid, x, y, radius, buildingId) {
	return withinTiles(grid, x, y, radius, (tile) => tile.buildingId === buildingId);
}

function withinTiles(grid, x, y, radius, predicate) {
	for (let dy = -radius; dy <= radius; dy += 1) {
		for (let dx = -radius; dx <= radius; dx += 1) {
			if (dx === 0 && dy === 0) continue;
			const tile = tileAt(grid, x + dx, y + dy);
			if (tile?.buildingId && predicate(tile)) return true;
		}
	}
	return false;
}

/**
 * Effective per-turn output of a placed building: capacity, IGR revenue and
 * secondary sector effects, all scaled by terrain modifiers, road adjacency,
 * and adjacency bonuses/requirements. `tile.buildingId` must already be set —
 * see `evaluatePlacement` for a read-only, not-yet-placed variant.
 * @param {object} run @param {{ x: number, y: number, type: string, buildingId: string }} tile
 */
export function evaluateBuildingAt(run, tile) {
	const building = buildingCatalog[tile.buildingId];
	if (!building) return null;
	const params = defaultRulebook.params;
	const mod = building.terrainModifiers?.[tile.type] || {};
	let effectMult = mod.effectMult ?? 1;

	const roadAdjacent = isRoadAdjacent(run.grid, tile.x, tile.y, params.roadAdjacencyRadius);
	if (building.requiresRoadAdjacent && !roadAdjacent) {
		effectMult *= params.reducedEffectMultiplier;
	}

	let functional = true;
	for (const bonus of building.adjacencyBonuses || []) {
		const met = hasNeighborBuilding(run.grid, tile.x, tile.y, bonus.withinTiles, bonus.near);
		if (met) {
			effectMult *= bonus.effectMult;
		} else if (bonus.required) {
			functional = false;
			effectMult = 0;
		}
	}

	return {
		building,
		roadAdjacent,
		functional,
		capacity: round((building.capacity || 0) * effectMult),
		igr: round((building.igr || 0) * effectMult),
		secondaryEffects: Object.fromEntries(
			Object.entries(building.secondaryEffects || {}).map(([sector, value]) => [
				sector,
				round(value * effectMult)
			])
		)
	};
}

/**
 * Read-only preview of what building `buildingId` would produce at (x, y) if
 * placed right now — does not mutate `run`. Powers the tap-to-place confirm panel.
 * @param {object} run @param {string} buildingId @param {number} x @param {number} y
 */
export function evaluatePlacement(run, buildingId, x, y) {
	if (!buildingCatalog[buildingId]) return null;
	const hypotheticalGrid = {
		size: run.grid.size,
		tiles: run.grid.tiles.map((tile) =>
			tile.x === x && tile.y === y ? { ...tile, buildingId } : tile
		)
	};
	const tile = tileAt(hypotheticalGrid, x, y);
	if (!tile) return null;
	return evaluateBuildingAt({ ...run, grid: hypotheticalGrid }, tile);
}

/** @param {number} scrutiny @param {typeof defaultRulebook.params} [params] */
export function stageForScrutiny(scrutiny, params = defaultRulebook.params) {
	const t = params.scrutinyThresholds;
	if (scrutiny >= t.conviction) return 'conviction';
	if (scrutiny >= t.probe) return 'probe';
	if (scrutiny >= t.press) return 'press';
	if (scrutiny >= t.whispers) return 'whispers';
	return 'none';
}

// Small seeded flavor events — each nudges one or two stats, never the whole board.
const EVENTS = [
	{
		id: 'donor_grant',
		weight: 2,
		text: 'A community donor topped up the ward development fund.',
		apply: (run) => {
			run.budget += 350_000;
		}
	},
	{
		id: 'flood',
		weight: 2,
		text: 'Flooding along the riverside damaged a local access road.',
		apply: (run) => {
			run.satisfaction = clamp(run.satisfaction - 4);
		}
	},
	{
		id: 'commissioning',
		weight: 2,
		text: "The state commissioner visited and commended the ward's projects.",
		apply: (run) => {
			run.satisfaction = clamp(run.satisfaction + 3);
		}
	},
	{
		id: 'blackout',
		weight: 2,
		text: 'A transformer fault caused a week-long blackout.',
		apply: (run) => {
			run.satisfaction = clamp(run.satisfaction - 3);
		}
	},
	{
		id: 'youth_protest',
		weight: 1,
		text: 'Youths protested unemployment outside the local government secretariat.',
		apply: (run) => {
			run.satisfaction = clamp(run.satisfaction - 5);
			run.scrutiny = clamp(run.scrutiny + 2, 0, 100);
		}
	},
	{
		id: 'market_day',
		weight: 2,
		text: 'A bumper market day brought in extra levies.',
		apply: (run) => {
			run.budget += 200_000;
		}
	}
];

function rollEvent(run) {
	const totalWeight = EVENTS.reduce((total, event) => total + event.weight, 0);
	const roll = rng(run.seed + run.turn * 104_729)() * totalWeight;
	let acc = 0;
	for (const event of EVENTS) {
		acc += event.weight;
		if (roll < acc) return event;
	}
	return EVENTS[EVENTS.length - 1];
}

/**
 * Pure turn resolver: revenue/maintenance, population growth, per-sector
 * supply/demand, satisfaction, scrutiny decay, and a small seeded event.
 * Does NOT advance `run.turn` or set `phase`/`ending` — that's `endTurn`'s job
 * in engine.js, which calls this and then handles the turn counter and endings.
 * @param {object} run
 */
export function resolveTurn(run) {
	const params = defaultRulebook.params;
	const next = clone(run);

	// --- construction progresses first, so a site finishing this turn starts working ---
	const completed = [];
	for (const tile of next.grid.tiles) {
		if (tile.buildingId && tile.turnsLeft > 0) {
			tile.turnsLeft -= 1;
			if (tile.turnsLeft === 0) completed.push(buildingCatalog[tile.buildingId]?.label);
		}
	}
	for (const label of completed.filter(Boolean)) {
		next.history.push(`${label} completed and opened to the public.`);
	}

	// Only finished buildings produce anything or cost upkeep.
	const placedTiles = next.grid.tiles.filter((tile) => tile.buildingId && !tile.turnsLeft);
	const evaluations = placedTiles.map((tile) => evaluateBuildingAt(next, tile)).filter(Boolean);

	// --- money: state allocation (scaled by how the ward is doing) + IGR - upkeep ---
	const frozen = next.scrutinyStage === 'probe';
	const maintenance = evaluations.reduce((total, e) => total + (e.building.maintenance || 0), 0);
	const revenue = frozen ? 0 : evaluations.reduce((total, e) => total + e.igr, 0);
	const allocation = frozen
		? 0
		: round(
				params.allocationBase *
					(params.allocationFloor + params.allocationGain * (next.satisfaction / 100))
			);
	const netRevenue = round(allocation + revenue - maintenance);
	next.budget = Math.max(0, round(next.budget + netRevenue));
	next.lastTurnRevenue = netRevenue;
	next.lastAllocation = allocation;
	next.lastMaintenance = maintenance;
	next.lastIgr = revenue;

	// --- inherited stock rots a little every turn ---
	const sectorNames = Object.keys(params.demandPerCapita);
	next.legacySupply = Object.fromEntries(
		sectorNames.map((sector) => [
			sector,
			round(
				(next.legacySupply?.[sector] ?? params.baseSupply?.[sector] ?? 0) *
					(1 - params.legacySupplyDecay)
			)
		])
	);

	// --- sector supply totals, on top of what's left of what the ward already had ---
	const supply = Object.fromEntries(
		sectorNames.map((sector) => [sector, next.legacySupply[sector] ?? 0])
	);
	for (const evaluation of evaluations) {
		supply[evaluation.building.sector] =
			(supply[evaluation.building.sector] || 0) + evaluation.capacity;
		for (const [sector, value] of Object.entries(evaluation.secondaryEffects)) {
			supply[sector] = (supply[sector] || 0) + value;
		}
	}

	// --- population growth (toward a housing/jobs ceiling), or decline when satisfaction craters ---
	const housingCeiling = supply.housing || 0;
	const jobsCeiling =
		params.demandPerCapita.jobs > 0 ? (supply.jobs || 0) / params.demandPerCapita.jobs : 0;
	// Housing sets the hard ceiling, jobs the softer one — you need both to grow.
	const ceiling = Math.max(params.populationFloor, Math.min(housingCeiling, jobsCeiling));
	let population = next.population;
	if (next.satisfaction < params.lowSatisfactionEmigrationThreshold) {
		population -= round(population * params.populationDeclineRate);
	} else {
		population += round((ceiling - population) * params.populationGrowthRate);
	}
	next.population = Math.max(params.populationFloor, round(population));

	// --- sector readout (demand grows with the new population) ---
	next.sectors = Object.fromEntries(
		sectorNames.map((sector) => [
			sector,
			{
				supply: supply[sector] || 0,
				demand: round(next.population * params.demandPerCapita[sector])
			}
		])
	);

	// --- satisfaction: weighted shortfall across sectors, smoothed against last turn ---
	let shortfallScore = 0;
	for (const sector of sectorNames) {
		const { supply: s, demand: d } = next.sectors[sector];
		const ratio = d > 0 ? Math.min(1, s / d) : 1;
		shortfallScore += params.satisfactionWeights[sector] * (1 - ratio);
	}
	const targetSatisfaction = clamp(round(100 - shortfallScore * 100));
	// Smooth from the *underlying* level, never the handout-inflated display value,
	// or bought goodwill would quietly bake itself into the baseline.
	const previous = run.baseSatisfaction ?? run.satisfaction;
	const settled = clamp(
		round(previous + (targetSatisfaction - previous) * params.satisfactionSmoothing)
	);

	// Handout money buys goodwill that fades — it never fixes the shortfall underneath.
	next.handoutBoost = round((next.handoutBoost || 0) * (1 - params.handoutDecay));
	if (next.handoutBoost < 1) next.handoutBoost = 0;

	next.baseSatisfaction = settled;
	next.satisfaction = clamp(settled + next.handoutBoost);
	next.targetSatisfaction = targetSatisfaction;

	// --- scrutiny decays on its own when things are going well ---
	if (next.satisfaction >= params.scrutinyDecayThreshold) {
		next.scrutiny = clamp(next.scrutiny - params.scrutinyDecayPerTurn, 0, 100);
	}
	next.scrutinyStage = stageForScrutiny(next.scrutiny, params);

	// --- a small seeded flavor event ---
	const eventRoll = rng(next.seed + next.turn * 7793)();
	if (eventRoll < params.eventChance) {
		const event = rollEvent(next);
		event.apply(next);
		next.history.push(event.text);
	}

	next.history.push(
		`Turn ${next.turn}: allocation ₦${allocation.toLocaleString()}, upkeep ₦${maintenance.toLocaleString()}` +
			`${revenue ? `, IGR ₦${revenue.toLocaleString()}` : ''} — satisfaction ${next.satisfaction}, population ${next.population.toLocaleString()}.`
	);

	return next;
}
