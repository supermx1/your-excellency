// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { toUiResponse, validateResponse } from './policy-sim.js';

const valid = {
	segments: [
		{ segmentId: 'Market women', reaction: 'supportive', approvalDelta: 12, keyConcern: 'Make market road safe first o.', protestProbability: 10, socialSentiment: 'trending_positive' },
		{ segmentId: 'Youth organisers', reaction: 'skeptical', approvalDelta: -5, keyConcern: 'Another committee? We want jobs.', protestProbability: 40, socialSentiment: 'neutral' },
		{ segmentId: 'Traditional leaders', reaction: 'indifferent', approvalDelta: 2, keyConcern: 'Consult the palaces before you start.', protestProbability: 5, socialSentiment: 'neutral' }
	],
	summary: {
		netApprovalDelta: 4,
		mostAffectedSegment: 'Youth organisers',
		implementationViability: 'medium',
		unintendedConsequences: ['Contractors circling the budget already.'],
		mediaNarrative: 'New security push meets tired applause',
		twitterTrend: '#SecureNaija'
	}
};

describe('policy-sim validation (PRD §5.4 acceptance)', () => {
	it('rejects malformed output so the fallback runs', () => {
		expect(validateResponse('sorry, as an AI I cannot')).toBe(null);
		expect(validateResponse({ segments: [] })).toBe(null);
		expect(validateResponse({ segments: valid.segments, summary: {} })).toBe(null);
	});

	it('accepts valid JSON (even wrapped in prose) and clamps ranges', () => {
		const noisy = 'Here you go:\n' + JSON.stringify({ ...valid, segments: [{ ...valid.segments[0], approvalDelta: 99 }, valid.segments[1], valid.segments[2]] });
		const sim = validateResponse(noisy);
		expect(sim.segments[0].approvalDelta).toBe(40);
	});

	it('maps PolicySimResponse to the shape the UI renders', () => {
		const ui = toUiResponse(validateResponse(valid));
		expect(ui.headline).toBe('New security push meets tired applause');
		expect(ui.segments).toHaveLength(3);
		expect(ui.segments[0]).toMatchObject({ name: 'Market women', concern: 'Make market road safe first o.' });
	});
});
