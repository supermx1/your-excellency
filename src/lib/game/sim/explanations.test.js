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

describe('playback explanations', () => {
	const cell = (o) => ({ id: 'kano', polityId: 'p1', pop: 1e6, foodStress: 0, netMigration: 0, incomeFactors: { literacy: 1.02, conflict: 1 }, ...o });
	const run = (cells, events = []) => ({ history: cells.map((c, i) => ({ year: 1900 + i, cells: [c] })), events });

	it('puts hardship first and names the cause', async () => {
		const { whyHere } = await import('./explanations.js');
		const r = run([cell({ foodStress: 0.4, incomeFactors: { conflict: 0.7 } })]);
		expect(whyHere(r, { yearInt: 1900 }, 'kano')[0].text).toBe('Fighting is disrupting food supplies');
	});

	it('notices recovery, recent politics and technology, and the strongest income factor', async () => {
		const { whyHere } = await import('./explanations.js');
		const r = run(
			[cell({ foodStress: 0.3 }), cell({}), cell({ incomeFactors: { literacy: 1.4, conflict: 0.95 } })],
			[
				{ year: 1890, kind: 'coup', polityIds: ['p1'], title: 'Too old to count' },
				{ year: 1901, kind: 'coup', polityIds: ['p1'], title: 'Palace coup in Kano' },
				{ year: 1902, kind: 'adoption', polityIds: ['p1'], title: 'Printing reaches Kano' },
				{ year: 1902, kind: 'adoption', polityIds: ['p9'], title: 'Somewhere else' }
			]
		);
		expect(whyHere(r, { yearInt: 1902 }, 'kano').map((l) => l.text)).toEqual([
			'Recovering from a food crisis',
			'Palace coup in Kano (1901)',
			'Printing reaches Kano (1902)'
		]);
		const quiet = {
			history: [{ year: 1900, cells: [cell({ incomeFactors: { literacy: 1.4 }, netMigration: -10000 }), cell({ id: 'oyo', incomeFactors: { literacy: 1.1 } })] }],
			events: []
		};
		expect(whyHere(quiet, { yearInt: 1900 }, 'kano').map((l) => l.text)).toEqual([
			'More people have been to school here than in most states',
			'People are leaving for better-paid states'
		]);
	});
});
