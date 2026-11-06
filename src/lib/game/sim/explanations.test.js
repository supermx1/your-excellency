// @ts-nocheck
import { describe, expect, it } from 'vitest';

describe('recorded income explanations', () => {
	it('uses recorded factors rather than recalculating old runs with current coefficients', async () => {
		const { incomeDrivers } = await import('./explanations.js');
		const rows = incomeDrivers({
			incomeFactors: { literacy: 2.5, electricity: 1.1, conflict: 0.8, food: 0.97 }
		});
		expect(rows.find((r) => r.key === 'literacy').multiplier).toBe(2.5);
		expect(rows.find((r) => r.key === 'conflict').multiplier).toBe(0.8);
		expect(rows.some((r) => r.key === 'infrastructure')).toBe(false);
	});
	it('leaves old recordings without driver details usable', async () => {
		const { incomeDrivers } = await import('./explanations.js');
		expect(incomeDrivers({ pop: 1e6 })).toEqual([]);
	});
});
