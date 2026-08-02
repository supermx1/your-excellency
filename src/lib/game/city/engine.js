// @ts-nocheck
import { hashString, rng } from '../engine.js';
import { buildingCatalog, computeBuildCost } from './buildings.js';
import { defaultRulebook, tileTypes } from './rulebook.js';
import {
	evaluatePlacement,
	hasNeighborBuilding,
	isRoadAdjacent,
	resolveTurn,
	stageForScrutiny,
	tileAt
} from './sim.js';
import { generateTerrain } from './terrain.js';

export { buildingCatalog, defaultRulebook, tileTypes };

/**
 * @typedef {{
 *   id: string, seed: number, playerName: string, constituencyName: string,
 *   turn: number, phase: 'playing'|'complete', budget: number, lastTurnRevenue: number,
 *   grid: { size: number, tiles: { x: number, y: number, type: string, buildingId: string|null }[] },
 *   sectors: { [sector: string]: { supply: number, demand: number } },
 *   population: number, satisfaction: number, scrutiny: number,
 *   scrutinyStage: 'none'|'whispers'|'press'|'probe'|'conviction',
 *   embezzledTotal: number, history: string[],
 *   ending: null | { title: string, score: number, summary: string }
 * }} CityRun
 */

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

/** @param {CityRun} run @param {string} error */
function fail(run, error) {
	return { ok: false, error, run };
}

/** @param {{ playerName?: string, constituencyName?: string, seed?: string|number }} [input] */
export function createCityRun({ playerName, constituencyName, seed } = {}) {
	const params = defaultRulebook.params;
	const finalSeed =
		seed != null
			? typeof seed === 'string'
				? hashString(seed)
				: seed >>> 0
			: hashString(
					`${playerName || 'Chairman'}-${constituencyName || 'Constituency'}-${Date.now()}`
				);

	const terrain = generateTerrain(finalSeed, params.gridSize);
	const sectors = Object.fromEntries(
		Object.keys(params.demandPerCapita).map((sector) => [
			sector,
			{ supply: 0, demand: round(params.startingPopulation * params.demandPerCapita[sector]) }
		])
	);

	return {
		ok: true,
		run: {
			id: crypto.randomUUID(),
			seed: finalSeed,
			playerName: playerName || 'The Chairman',
			constituencyName: constituencyName || 'Amuwo East',
			turn: 1,
			phase: 'playing',
			budget: params.startingBudget,
			lastTurnRevenue: 0,
			grid: {
				size: params.gridSize,
				// `turnsLeft > 0` means the site is still under construction and
				// contributes nothing until it hits zero.
				tiles: terrain.map((tile) => ({ ...tile, buildingId: null, turnsLeft: 0 }))
			},
			sectors,
			population: params.startingPopulation,
			satisfaction: 55,
			baseSatisfaction: 55,
			targetSatisfaction: 55,
			handoutBoost: 0,
			scrutiny: 0,
			scrutinyStage: 'none',
			embezzledTotal: 0,
			// Cash actually sitting in your pocket right now, as opposed to
			// `embezzledTotal`, which is the lifetime figure the EFCC would quote.
			personalFunds: 0,
			electionInsurance: false,
			lastAllocation: 0,
			lastMaintenance: 0,
			lastIgr: 0,
			// Inherited infrastructure, which decays each turn unless you replace it.
			legacySupply: { ...params.baseSupply },
			history: [
				`${constituencyName || 'The constituency'} takes office. Twelve quarters to make a name.`
			],
			ending: null
		}
	};
}

/**
 * Read-only preview for the tap-to-place confirm panel: cost, sector effect,
 * and terrain/adjacency notes. Never mutates `run`.
 * @param {CityRun} run @param {string} buildingId @param {number} x @param {number} y
 */
export function previewPlacement(run, buildingId, x, y) {
	const building = buildingCatalog[buildingId];
	if (!building) return { ok: false, reason: 'Unknown building type.' };
	if (run.phase !== 'playing') return { ok: false, reason: 'The term is over.' };
	if (run.scrutinyStage === 'probe')
		return { ok: false, reason: 'EFCC has frozen the accounts pending investigation.' };

	const tile = tileAt(run.grid, x, y);
	if (!tile) return { ok: false, reason: 'That tile is outside the constituency.' };
	if (tile.buildingId) {
		return {
			ok: false,
			reason: tile.turnsLeft
				? 'A site is already under construction there.'
				: 'Something is already built there.'
		};
	}

	const cost = computeBuildCost(building, tile.type);
	if (run.budget < cost)
		return { ok: false, reason: `Not enough budget — need ₦${cost.toLocaleString()}.` };

	const roadAdjacent = isRoadAdjacent(run.grid, x, y, defaultRulebook.params.roadAdjacencyRadius);
	const evaluation = evaluatePlacement(run, buildingId, x, y);

	return {
		ok: true,
		cost,
		sectorEffect: {
			sector: building.sector,
			capacity: evaluation?.capacity ?? building.capacity,
			igr: evaluation?.igr ?? building.igr
		},
		terrainNote: describeTerrainEffect(building, tile.type),
		adjacencyNote: describeAdjacency(run, building, x, y, roadAdjacent)
	};
}

function describeTerrainEffect(building, tileType) {
	const landNote = tileTypes[tileType]?.description || '';
	const mod = building.terrainModifiers?.[tileType];
	if (!mod) return landNote;
	const bits = [];
	if (mod.costMult && mod.costMult !== 1)
		bits.push(mod.costMult < 1 ? 'cheaper to build here' : 'costs more to build here');
	if (mod.effectMult && mod.effectMult !== 1)
		bits.push(mod.effectMult > 1 ? 'works better on this terrain' : 'works worse on this terrain');
	return bits.length ? `${landNote} This building is ${bits.join(', ')}.` : landNote;
}

function describeAdjacency(run, building, x, y, roadAdjacent) {
	const notes = [];
	if (building.requiresRoadAdjacent) {
		notes.push(
			roadAdjacent
				? 'Road-connected — full effect.'
				: 'No road nearby — this will run at reduced effect until one is built within reach.'
		);
	}
	for (const bonus of building.adjacencyBonuses || []) {
		const met = hasNeighborBuilding(run.grid, x, y, bonus.withinTiles, bonus.near);
		if (bonus.required) {
			notes.push(
				met ? `Powered — a ${buildingCatalog[bonus.near]?.label} is in range.` : bonus.description
			);
		} else {
			notes.push(
				met ? `Bonus active: ${bonus.description}` : `Potential bonus: ${bonus.description}`
			);
		}
	}
	return notes.join(' ');
}

/** @param {CityRun} run @param {string} buildingId @param {number} x @param {number} y */
export function placeBuilding(run, buildingId, x, y) {
	const preview = previewPlacement(run, buildingId, x, y);
	if (!preview.ok) return fail(run, preview.reason);

	const next = clone(run);
	const tile = tileAt(next.grid, x, y);
	const building = buildingCatalog[buildingId];
	tile.buildingId = buildingId;
	// Paid up front, delivered later — that lead time is the whole point.
	tile.turnsLeft = building.buildTurns ?? 0;
	next.budget -= preview.cost;
	next.history.push(
		tile.turnsLeft > 0
			? `Broke ground on a ${building.label} at (${x}, ${y}) — ₦${preview.cost.toLocaleString()}, ${tile.turnsLeft} turn${tile.turnsLeft === 1 ? '' : 's'} to build.`
			: `Built a ${building.label} at (${x}, ${y}) for ₦${preview.cost.toLocaleString()}.`
	);
	return { ok: true, run: next };
}

/** @param {CityRun} run @param {number} amount */
export function embezzle(run, amount) {
	const params = defaultRulebook.params;
	if (run.phase !== 'playing') return fail(run, 'The term is over.');
	if (run.scrutinyStage === 'probe')
		return fail(run, 'EFCC has frozen the accounts pending investigation.');
	if (!(amount > 0)) return fail(run, 'Enter an amount to divert.');
	if (run.budget < amount) return fail(run, 'Not enough budget to divert that much.');

	const next = clone(run);
	next.budget -= amount;
	next.embezzledTotal += amount;
	next.personalFunds += amount;
	const bump = Math.max(params.scrutinyMinBump, round(amount * params.scrutinyPerNairaEmbezzled));
	next.scrutiny = clamp(next.scrutiny + bump, 0, 100);
	next.scrutinyStage = stageForScrutiny(next.scrutiny, params);
	next.history.push(`₦${amount.toLocaleString()} quietly diverted. Scrutiny is rising.`);

	if (next.scrutinyStage === 'conviction') {
		next.phase = 'complete';
		next.ending = buildEnding(next);
		next.history.push('EFCC operatives storm the secretariat. Conviction secured.');
	}
	return { ok: true, run: next };
}

/**
 * Spend diverted cash on handouts: bags of rice, transport money, party shirts.
 * Buys a real but fast-decaying satisfaction bump and fixes nothing underneath —
 * see `resolveTurn`, which decays `handoutBoost` every turn.
 * @param {CityRun} run
 */
export function buyHandout(run) {
	const params = defaultRulebook.params;
	if (run.phase !== 'playing') return fail(run, 'The term is over.');
	if (run.personalFunds < params.handoutCost) {
		return fail(
			run,
			`You need ₦${params.handoutCost.toLocaleString()} of your own money for that.`
		);
	}

	const next = clone(run);
	next.personalFunds -= params.handoutCost;
	next.handoutBoost = (next.handoutBoost || 0) + params.handoutBoost;
	next.satisfaction = clamp((next.baseSatisfaction ?? next.satisfaction) + next.handoutBoost);
	next.scrutiny = clamp(next.scrutiny + params.handoutScrutiny, 0, 100);
	next.scrutinyStage = stageForScrutiny(next.scrutiny, params);
	next.history.push('Rice, transport money and party shirts went round the ward. People cheered.');

	if (next.scrutinyStage === 'conviction') {
		next.phase = 'complete';
		next.ending = buildEnding(next);
		next.history.push('EFCC operatives storm the secretariat. Conviction secured.');
	}
	return { ok: true, run: next };
}

/**
 * Buy your way past the verdict: agents, thugs and a friendly returning officer.
 * At the end of the term this converts a losing result into a retained seat.
 * @param {CityRun} run
 */
export function buyElectionInsurance(run) {
	const params = defaultRulebook.params;
	if (run.phase !== 'playing') return fail(run, 'The term is over.');
	if (run.electionInsurance) return fail(run, 'The arrangement is already in place.');
	if (run.personalFunds < params.electionInsuranceCost) {
		return fail(
			run,
			`You need ₦${params.electionInsuranceCost.toLocaleString()} of your own money for that.`
		);
	}

	const next = clone(run);
	next.personalFunds -= params.electionInsuranceCost;
	next.electionInsurance = true;
	next.scrutiny = clamp(next.scrutiny + params.electionInsuranceScrutiny, 0, 100);
	next.scrutinyStage = stageForScrutiny(next.scrutiny, params);
	next.history.push('A quiet arrangement was reached about the next election. It was not cheap.');

	if (next.scrutinyStage === 'conviction') {
		next.phase = 'complete';
		next.ending = buildEnding(next);
		next.history.push('EFCC operatives storm the secretariat. Conviction secured.');
	}
	return { ok: true, run: next };
}

/** @param {CityRun} run */
export function endTurn(run) {
	if (run.phase !== 'playing') return fail(run, 'The term is already over.');

	const next = resolveTurn(run);
	next.turn += 1;

	if (next.scrutinyStage === 'conviction') {
		next.phase = 'complete';
		next.ending = buildEnding(next);
		next.history.push('EFCC operatives storm the secretariat. Conviction secured.');
	} else if (next.turn > defaultRulebook.params.turns) {
		next.phase = 'complete';
		next.ending = buildEnding(next);
		next.history.push('The term ends. The constituency looks back on three years.');
	}

	return { ok: true, run: next };
}

/** @param {CityRun} run */
function buildEnding(run) {
	const params = defaultRulebook.params;
	const sectorEntries = Object.values(run.sectors);
	const deliveryRatios = sectorEntries.map((s) =>
		s.demand > 0 ? Math.min(1, s.supply / s.demand) : 1
	);
	const delivery = round(
		(deliveryRatios.reduce((a, b) => a + b, 0) / (deliveryRatios.length || 1)) * 100
	);
	const embezzlementPenalty = Math.min(100, round(run.embezzledTotal / 400_000));
	const integrity = clamp(round(100 - run.scrutiny * 0.6 - embezzlementPenalty * 0.4));
	const weights = params.endingWeights;
	const score = clamp(
		round(
			run.satisfaction * weights.satisfaction +
				delivery * weights.delivery +
				integrity * weights.integrity
		)
	);

	// Rigging doesn't make the ward better — it just means the verdict can't remove you.
	const rigged = Boolean(run.electionInsurance);
	const returned = rigged || run.satisfaction >= 50;
	const cleanRun = run.embezzledTotal <= params.allocationBase * 0.15;

	let title;
	let summary;
	if (run.scrutinyStage === 'conviction') {
		title = 'Yahoo Governor in Kirikiri';
		summary = `Convicted before the term even ended. ₦${run.embezzledTotal.toLocaleString()} traced, and the EFCC made an example of ${run.playerName}.`;
	} else if (rigged && run.satisfaction < 50) {
		title = 'Returned Unopposed';
		summary = `${run.constituencyName} wanted you gone and got you back anyway. The result was arranged long before anyone voted — satisfaction closed at ${run.satisfaction}.`;
	} else if (run.satisfaction >= 75 && integrity >= 70 && cleanRun) {
		title = 'Father of the Constituency';
		summary = `${run.constituencyName} remembers this term as the one that actually delivered. Satisfaction closed at ${run.satisfaction}.`;
	} else if (run.embezzledTotal >= params.allocationBase * 1.5) {
		title = 'Contract Chairman';
		summary = `₦${run.embezzledTotal.toLocaleString()} found its way into private pockets — and somehow, no handcuffs. Constituents noticed anyway.`;
	} else if (run.satisfaction < 40 && cleanRun) {
		title = 'The Absentee Chairman';
		summary = `Not corrupt — just absent. Little was built, and ${run.constituencyName} is worse off than it started.`;
	} else if (delivery < 45) {
		title = 'Ward of Half-Finished Projects';
		summary =
			'Foundations everywhere, ribbons nowhere. Too much sat too far from a road to ever really work.';
	} else {
		title = 'The Honourable Survivor';
		summary = `Neither hero nor villain. ${run.constituencyName} got through four years — unremarkable, un-convicted, unfinished business for the next chairman.`;
	}

	return {
		title,
		score,
		summary,
		delivery,
		integrity,
		returned,
		rigged,
		personalFunds: run.personalFunds || 0
	};
}

/** @param {CityRun} run */
export function saveCityRun(run) {
	localStorage.setItem('your-excellency-city-current', JSON.stringify(run));
	const history = JSON.parse(localStorage.getItem('your-excellency-city-history') || '[]');
	if (run.phase === 'complete' && !history.some((item) => item.id === run.id)) {
		history.unshift(run);
		localStorage.setItem('your-excellency-city-history', JSON.stringify(history.slice(0, 8)));
	}
}

/** @returns {CityRun | null} */
export function loadCityRun() {
	const raw = localStorage.getItem('your-excellency-city-current');
	return raw ? JSON.parse(raw) : null;
}

/** @returns {CityRun[]} */
export function loadCityHistory() {
	return JSON.parse(localStorage.getItem('your-excellency-city-history') || '[]');
}
