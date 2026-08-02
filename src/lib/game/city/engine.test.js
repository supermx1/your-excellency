// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { defaultRulebook } from './rulebook.js';
import {
	buildingCatalog,
	buyElectionInsurance,
	buyHandout,
	createCityRun,
	embezzle,
	endTurn,
	placeBuilding,
	previewPlacement
} from './engine.js';

function startedRun(overrides = {}) {
	const result = createCityRun({
		playerName: 'Ada',
		constituencyName: 'Amuwo East',
		seed: 'test-seed',
		...overrides
	});
	if (!result.ok) throw new Error(result.error);
	return result.run;
}

function firstTileOfType(run, type) {
	return run.grid.tiles.find((tile) => tile.type === type && !tile.buildingId);
}

describe('The Constituency engine', () => {
	it('creates a run with a full 14x14 grid, starting budget and population', () => {
		const run = startedRun();
		expect(run.grid.size).toBe(14);
		expect(run.grid.tiles).toHaveLength(196);
		expect(run.budget).toBe(defaultRulebook.params.startingBudget);
		expect(run.population).toBe(defaultRulebook.params.startingPopulation);
		expect(run.turn).toBe(1);
		expect(run.phase).toBe('playing');
		expect(run.scrutinyStage).toBe('none');
	});

	it('generates the same terrain for the same seed', () => {
		const a = createCityRun({ seed: 'lagos-1' }).run;
		const b = createCityRun({ seed: 'lagos-1' }).run;
		expect(a.grid.tiles).toEqual(b.grid.tiles);
	});

	it('places a building, deducting cost and marking the tile', () => {
		const run = startedRun();
		const tile = firstTileOfType(run, 'scrub') || run.grid.tiles[0];
		const preview = previewPlacement(run, 'road', tile.x, tile.y);
		expect(preview.ok).toBe(true);

		const result = placeBuilding(run, 'road', tile.x, tile.y);
		expect(result.ok).toBe(true);
		expect(result.run.budget).toBe(run.budget - preview.cost);
		const placedTile = result.run.grid.tiles.find((t) => t.x === tile.x && t.y === tile.y);
		expect(placedTile.buildingId).toBe('road');
	});

	it('rejects placement on an occupied tile', () => {
		const run = startedRun();
		const tile = run.grid.tiles[0];
		const first = placeBuilding(run, 'road', tile.x, tile.y);
		expect(first.ok).toBe(true);

		const second = placeBuilding(first.run, 'borehole', tile.x, tile.y);
		expect(second.ok).toBe(false);
		expect(second.error).toMatch(/already built|under construction/i);
	});

	it('rejects placement out of bounds', () => {
		const run = startedRun();
		const result = placeBuilding(run, 'road', 99, 99);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/outside the constituency/i);
	});

	it('rejects placement the player cannot afford', () => {
		const run = startedRun({ playerName: 'Broke', constituencyName: 'Broke Ward' });
		run.budget = 1000;
		const tile = run.grid.tiles[0];
		const result = placeBuilding(run, 'hospital', tile.x, tile.y);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/not enough budget/i);
	});

	it('does not mutate the run when previewing a placement (read-only)', () => {
		const run = startedRun();
		const before = JSON.stringify(run);
		previewPlacement(run, 'road', 0, 0);
		expect(JSON.stringify(run)).toBe(before);
	});

	it('flags the headline adjacency example: a transformer needs a nearby power source to function', () => {
		const run = startedRun();
		const previewAlone = previewPlacement(run, 'transformer', 3, 3);
		expect(previewAlone.ok).toBe(true);
		expect(previewAlone.sectorEffect.capacity).toBe(0);

		const withGrid = placeBuilding(run, 'solar_minigrid', 3, 2);
		expect(withGrid.ok).toBe(true);
		const previewNear = previewPlacement(withGrid.run, 'transformer', 3, 3);
		expect(previewNear.sectorEffect.capacity).toBeGreaterThan(0);
	});

	it('resolves a turn deterministically for the same seed', () => {
		const runA = startedRun();
		const runB = startedRun();
		const endA = endTurn(runA);
		const endB = endTurn(runB);

		expect(endA.ok).toBe(true);
		expect(endA.run.turn).toBe(2);
		expect(endA.run.budget).toBe(endB.run.budget);
		expect(endA.run.satisfaction).toBe(endB.run.satisfaction);
		expect(endA.run.history).toEqual(endB.run.history);
	});

	it('embezzling moves budget into embezzledTotal and raises scrutiny', () => {
		const run = startedRun();
		const result = embezzle(run, 5_000_000);
		expect(result.ok).toBe(true);
		expect(result.run.budget).toBe(run.budget - 5_000_000);
		expect(result.run.embezzledTotal).toBe(5_000_000);
		expect(result.run.scrutiny).toBeGreaterThan(run.scrutiny);
	});

	it('a large enough embezzlement can trigger conviction immediately', () => {
		const run = startedRun();
		run.budget = 200_000_000; // well beyond a normal term's take, to force conviction in one shot
		const result = embezzle(run, run.budget);
		expect(result.ok).toBe(true);
		expect(result.run.scrutinyStage).toBe('conviction');
		expect(result.run.phase).toBe('complete');
		expect(result.run.ending.title).toBe('Yahoo Governor in Kirikiri');
	});

	it('rejects embezzling more than the available budget', () => {
		const run = startedRun();
		const result = embezzle(run, run.budget + 1);
		expect(result.ok).toBe(false);
	});

	it('reaches turn 12 with a complete phase and an ending', () => {
		let run = startedRun();
		for (let i = 0; i < defaultRulebook.params.turns; i += 1) {
			const result = endTurn(run);
			expect(result.ok).toBe(true);
			run = result.run;
		}
		expect(run.phase).toBe('complete');
		expect(run.ending).toBeTruthy();
		expect(typeof run.ending.title).toBe('string');
		expect(typeof run.ending.score).toBe('number');
	});

	it('exposes exactly 13 buildings covering every scored sector', () => {
		const ids = Object.keys(buildingCatalog);
		expect(ids).toHaveLength(13);
		const sectors = new Set(Object.values(buildingCatalog).map((b) => b.sector));
		// Every sector satisfaction scores must be buildable — a sector with no
		// building is an unavoidable permanent shortfall.
		expect(sectors).toEqual(new Set(Object.keys(defaultRulebook.params.demandPerCapita)));
	});

	it('gives every building a positive build time', () => {
		for (const [id, building] of Object.entries(buildingCatalog)) {
			expect(building.buildTurns, id).toBeGreaterThan(0);
		}
	});

	it('holds a building under construction until its build time elapses', () => {
		let run = startedRun();
		const tile = firstTileOfType(run, 'scrub') || run.grid.tiles[0];
		run = placeBuilding(run, 'hospital', tile.x, tile.y).run;

		const site = () => run.grid.tiles.find((t) => t.x === tile.x && t.y === tile.y);
		expect(site().turnsLeft).toBe(buildingCatalog.hospital.buildTurns);

		for (let i = 0; i < buildingCatalog.hospital.buildTurns; i += 1) {
			expect(site().turnsLeft).toBeGreaterThan(0);
			run = endTurn(run).run;
		}
		expect(site().turnsLeft).toBe(0);
	});

	it('pays a state allocation each turn that scales with satisfaction', () => {
		const run = startedRun();
		const after = endTurn(run).run;
		expect(after.lastAllocation).toBeGreaterThan(0);

		const unhappy = endTurn({ ...run, satisfaction: 5 }).run;
		const happy = endTurn({ ...run, satisfaction: 95 }).run;
		expect(happy.lastAllocation).toBeGreaterThan(unhappy.lastAllocation);
	});

	it('lets inherited infrastructure rot, so doing nothing loses ground', () => {
		let run = startedRun();
		const first = run.legacySupply.water;
		for (let i = 0; i < 4; i += 1) run = endTurn(run).run;
		expect(run.legacySupply.water).toBeLessThan(first);
		expect(run.satisfaction).toBeLessThan(30);
	});

	it('buys a satisfaction bump with handouts that decays instead of sticking', () => {
		let run = startedRun();
		run = embezzle(run, 10_000_000).run;
		const before = run.satisfaction;

		const bought = buyHandout(run);
		expect(bought.ok).toBe(true);
		expect(bought.run.satisfaction).toBeGreaterThan(before);
		expect(bought.run.personalFunds).toBe(run.personalFunds - defaultRulebook.params.handoutCost);
		expect(bought.run.scrutiny).toBeGreaterThan(run.scrutiny);

		// the bump fades rather than becoming the new baseline
		const later = endTurn(bought.run).run;
		expect(later.handoutBoost).toBeLessThan(bought.run.handoutBoost);
	});

	it('refuses handouts and rigging without enough diverted cash', () => {
		const run = startedRun();
		expect(buyHandout(run).ok).toBe(false);
		expect(buyElectionInsurance(run).ok).toBe(false);
	});

	it('lets a rigged election survive a verdict the ward would have lost', () => {
		let run = startedRun();
		// must stay within the starting budget, or the diversion silently fails
		run = embezzle(run, defaultRulebook.params.electionInsuranceCost).run;
		run = buyElectionInsurance(run).run;
		expect(run.electionInsurance).toBe(true);

		run = { ...run, turn: defaultRulebook.params.turns, satisfaction: 20, scrutiny: 10 };
		const done = endTurn(run).run;
		expect(done.phase).toBe('complete');
		expect(done.ending.returned).toBe(true);
		expect(done.ending.rigged).toBe(true);
	});

	it('survives being handed a proxy-like state object (clone must not require structuredClone)', () => {
		const run = new Proxy(startedRun(), {});
		const result = placeBuilding(run, 'road', 0, 0);
		expect(result.ok).toBe(true);
	});
});
