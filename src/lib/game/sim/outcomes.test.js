// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { summarize } from './worker.js';

const fixture = (pop, endYear = 2050) => ({
	inputs: { endYear },
	events: [],
	history: [
		{ year: 2025, totals: { pop: 10, litAny: 0.1, lifeExp: 30, incomePc: 500 }, polities: [] },
		{ year: endYear, totals: { pop, litAny: 0.8, lifeExp: 60, incomePc: 5000 }, polities: [] }
	]
});

describe('end-year ensemble outcomes', () => {
	it('reports ranges at the actual ending year while retaining old 2025 fields', () => {
		const s = summarize([fixture(100), fixture(200), fixture(300)]);
		expect(s.endYear).toBe(2050);
		expect(s.outcomes.population).toEqual({ min: 100, p10: 120, median: 200, p90: 280, max: 300 });
		expect(s.pop2025.median).toBe(10);
		expect(s.outcomes.lifeExpectancy.median).toBe(60);
	});
	it('refuses to mix incompatible end years into one range', () => {
		expect(() => summarize([fixture(100, 2050), fixture(300, 2100)])).toThrow(/end year/i);
	});
	it('handles a single run without inventing variation', () => {
		const s = summarize([fixture(100)]);
		expect(s.outcomes.population.p10).toBe(100);
		expect(s.outcomes.population.p90).toBe(100);
	});
});
