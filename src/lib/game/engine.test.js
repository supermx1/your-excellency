// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
	applyCampaignAction,
	calculateRiggingDetection,
	calculateVotes,
	createRun,
	resolveElection
} from './engine.js';

function startedRun() {
	const result = createRun({ playerName: 'Ada', party: 'LP' });
	if (!result.ok) throw new Error(result.error);
	return result.run;
}

describe('Your Excellency engine', () => {
	it('rejects founding a party below the rulebook threshold', () => {
		const result = createRun({
			playerName: 'Ada',
			party: 'FOUND',
			foundingMembers: 1200,
			foundingSpread: 2
		});

		expect(result.ok).toBe(false);
		expect(result.provisionId).toBe('EA-REG-001');
	});

	it('spends AP and advances the campaign deterministically', () => {
		let run = startedRun();
		const first = applyCampaignAction(run, 'ground_game', 'lagos');
		expect(first.ok).toBe(true);
		expect(first.run.ap).toBe(3);

		const replay = applyCampaignAction(run, 'ground_game', 'lagos');
		expect(replay.run.support).toEqual(first.run.support);
		expect(replay.run.naira).toBe(first.run.naira);
	});

	it('scales cost and effect with the chosen spend level', () => {
		const run = startedRun();
		const small = applyCampaignAction(run, 'ground_game', 'lagos', 'small');
		const large = applyCampaignAction(run, 'ground_game', 'lagos', 'large');

		expect(run.naira - small.run.naira).toBe(30_000_000);
		expect(run.naira - large.run.naira).toBe(120_000_000);
		expect(large.run.support.lagos.genuine).toBeGreaterThan(small.run.support.lagos.genuine);
	});

	it('suppresses turnout in higher-insecurity states', () => {
		const run = startedRun();
		const votes = calculateVotes(run);
		const ekiti = votes.states.find((state) => state.id === 'ekiti');
		const zamfara = votes.states.find((state) => state.id === 'zamfara');

		expect(zamfara.effectiveTurnout).toBeLessThan(ekiti.effectiveTurnout);
	});

	it('lowers rigging detection where insecurity is higher', () => {
		const run = startedRun();
		const ekiti = run.state.states.find((state) => state.id === 'ekiti');
		const zamfara = run.state.states.find((state) => state.id === 'zamfara');

		expect(calculateRiggingDetection('inec_bribe', zamfara)).toBeLessThan(
			calculateRiggingDetection('inec_bribe', ekiti)
		);
	});

	it('keeps rigging rolls deterministic for a seed', () => {
		let run = startedRun();
		run.phase = 'election';
		const first = resolveElection(run, 'inec_bribe', 'zamfara');
		const second = resolveElection(run, 'inec_bribe', 'zamfara');

		expect(first.run.election).toEqual(second.run.election);
	});

	it('treats get_out_the_vote as a clean twin: votes gained, zero detection, no integrity hit', () => {
		const run = startedRun();
		run.phase = 'election';
		const zamfara = run.state.states.find((state) => state.id === 'zamfara');

		expect(calculateRiggingDetection('get_out_the_vote', zamfara)).toBe(0);

		const result = resolveElection(run, 'get_out_the_vote', 'zamfara');
		expect(result.run.election.detected).toBe(false);
		expect(result.run.election.votesRigged).toBe(350_000);
		expect(result.run.legacy.integrity).toBe(run.legacy.integrity);
		expect(result.run.cleanChoices).toBe(run.cleanChoices + 1);
	});

	it('does not treat clean GOTV votes as rigging evidence at tribunal', async () => {
		const { resolveTribunal } = await import('./engine.js');
		const run = startedRun();
		run.phase = 'tribunal';
		run.election = { actionId: 'get_out_the_vote', detected: false, votesRigged: 350_000 };
		const clean = resolveTribunal(run, 'legal_spend');
		expect(clean.run.tribunal.evidenceScore).toBe(24);

		run.election = { actionId: 'ec8_forgery', detected: true, votesRigged: 750_000 };
		const dirty = resolveTribunal(run, 'legal_spend');
		expect(dirty.run.tribunal.evidenceScore).toBe(78);
	});

	it('survives being handed a proxy-like state object (clone must not require structuredClone)', () => {
		const run = new Proxy(startedRun(), {});
		const result = applyCampaignAction(run, 'rally', 'lagos');
		expect(result.ok).toBe(true);
		expect(result.run.ap).toBe(3);
	});

	it('applies the character build to starting stats', () => {
		const governor = createRun({ party: 'LP', career: 'governor' }).run;
		const outsider = createRun({ party: 'LP', career: 'outsider' }).run;
		expect(governor.connections).toBeGreaterThan(outsider.connections);

		expect(createRun({ party: 'LP', wealth: 'billionaire' }).run.naira).toBe(8_000_000_000);

		const corrupt = createRun({ party: 'LP', scandal: 'corruption_allegations' }).run;
		expect(corrupt.efccRisk).toBe(20);
		expect(corrupt.legacy.integrity).toBeLessThan(
			createRun({ party: 'LP', scandal: 'clean' }).run.legacy.integrity
		);
	});

	it('gives a home-state advantage in your state of origin', () => {
		const fromKano = calculateVotes(createRun({ party: 'LP', origin: 'kano' }).run);
		const fromLagos = calculateVotes(createRun({ party: 'LP', origin: 'lagos' }).run);
		const kanoA = fromKano.states.find((s) => s.id === 'kano');
		const kanoB = fromLagos.states.find((s) => s.id === 'kano');
		expect(kanoA.playerVotes).toBeGreaterThan(kanoB.playerVotes);
	});

	it('leans support along religious bloc lines without locking it', () => {
		const muslim = calculateVotes(createRun({ party: 'LP', religion: 'Muslim', origin: 'lagos' }).run);
		const christian = calculateVotes(createRun({ party: 'LP', religion: 'Christian', origin: 'lagos' }).run);
		const kanoMuslim = muslim.states.find((s) => s.id === 'kano'); // muslim-lean state
		const kanoChristian = christian.states.find((s) => s.id === 'kano');
		expect(kanoMuslim.playerVotes).toBeGreaterThan(kanoChristian.playerVotes);
	});
});
