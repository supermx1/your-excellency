// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { createWorld, runSimulation, stepWorld } from './world.js';
import { defaultData } from './data/index.js';
import { defaultSwitches } from './switches.js';
import { PARAMS as P } from './params.js';
import { stepEconomy, roadsFor } from './rules/economy.js';
import { stepDemography } from './rules/demography.js';
import { stepFamilies } from './rules/families.js';
import { statsAt } from './hud.js';
import { formatStat } from './format.js';

const inputs = (startYear) => ({ seed: 42, switches: {}, startYear, endYear: startYear + 1 });
const fixture = (cell = {}, switches = {}, tech = ['printing', 'electricity']) =>
	createWorld(
		{ ...inputs(2000), switches },
		{
			cells: [
				{
					id: 'kano',
					name: 'Kano',
					neighbours: [],
					pop: 1e6,
					area: 1,
					coastal: false,
					incomePc: 2000,
					infra: 0.5,
					litAny: 0.6,
					...cell
				}
			],
			polities: [
				{ id: 'p', name: 'P', capitalCell: 'kano', cellIds: ['kano'], stability: 0.8, tech }
			],
			events: { events: [] },
			tech: [],
			names: defaultData.names
		}
	);

describe('dated development evidence', () => {
	it('starts modern cells from measured state electricity access and primary attendance', () => {
		const w = createWorld(inputs(2018));
		expect(w.cellById.get('lagos').electricityAccess).toBeCloseTo(0.989);
		expect(w.cellById.get('taraba').electricityAccess).toBeCloseTo(0.207);
		const lagos = w.cellById.get('lagos');
		expect(lagos.schools.mission + lagos.schools.state).toBeCloseTo(0.74);
		expect(lagos.developmentYear).toBe(2018);
	});

	it('does not use a later survey for an earlier starting year', () => {
		const early = createWorld(inputs(2012));
		expect(early.cellById.get('lagos').developmentYear).toBeNull();
		expect(early.cellById.get('lagos').electricityAccess).toBeLessThan(0.989);
		const middle = createWorld(inputs(2015));
		expect(middle.cellById.get('lagos').developmentYear).toBe(2013);
	});

	it('does not inject observations into a running alternate history', () => {
		const altered = structuredClone(defaultData);
		altered.development = {
			snapshots: [
				{
					year: 2018,
					cells: Object.fromEntries(
						defaultData.cells.map((c) => [
							c.id,
							{ electricityAccess: { value: 0 }, primaryAttendance: { value: 0 } }
						])
					)
				}
			]
		};
		const a = runSimulation({ ...inputs(2010), endYear: 2020 }, defaultData);
		const b = runSimulation({ ...inputs(2010), endYear: 2020 }, altered);
		expect(a.history).toEqual(b.history);
	});
});

describe('electricity and school capacity', () => {
	it('connected areas produce more income than otherwise identical unconnected areas', () => {
		const off = fixture({ electricityAccess: 0 });
		const on = fixture({ electricityAccess: 1 });
		stepEconomy(off);
		stepEconomy(on);
		expect(on.cells[0].incomePc).toBeGreaterThan(off.cells[0].incomePc);
	});

	it('access alone does not provide the same service as the uninterrupted-power scenario', () => {
		const intermittent = fixture({ electricityAccess: 1 });
		const reliable = fixture({ electricityAccess: 1 }, { power24hFromYear: 2000 });
		stepEconomy(intermittent);
		stepEconomy(reliable);
		expect(reliable.cells[0].powerService).toBe(1);
		expect(intermittent.cells[0].powerService).toBeLessThan(1);
		expect(reliable.cells[0].incomePc).toBeGreaterThan(intermittent.cells[0].incomePc);
	});

	it('ordinary connections require electricity technology and grow gradually', () => {
		const old = fixture({}, {}, ['printing']);
		const modern = fixture({ electricityAccess: 0 });
		stepEconomy(old);
		stepEconomy(modern);
		expect(old.cells[0].electricityAccess).toBe(0);
		expect(modern.cells[0].electricityAccess).toBeGreaterThan(0);
		expect(modern.cells[0].electricityAccess).toBeLessThan(0.1);
	});

	it('free-school policy builds capacity over time rather than granting it in the first year', () => {
		const w = fixture({}, { freeSchoolingFromYear: 2000 });
		stepEconomy(w);
		const first = w.cells[0].schoolExpansion;
		expect(first).toBeGreaterThan(0);
		expect(first).toBeLessThan(0.1);
		for (let i = 0; i < 20; i++) {
			stepEconomy(w);
			stepDemography(w);
		}
		expect(w.cells[0].schoolExpansion).toBeGreaterThan(first);
		expect(w.cells[0].schoolExpansion).toBeLessThanOrEqual(0.4);
	});

	it('school expansion responds to local resources and available skills', () => {
		const poor = fixture({ incomePc: 500, litAny: 0.05 }, { freeSchoolingFromYear: 2000 });
		const rich = fixture({ incomePc: 5000, litAny: 0.9 }, { freeSchoolingFromYear: 2000 });
		stepEconomy(poor);
		stepEconomy(rich);
		expect(rich.cells[0].schoolExpansion).toBeGreaterThan(poor.cells[0].schoolExpansion);
	});

	it('records a household connection once and includes it in the existing family cards', () => {
		const w = fixture({ electricityAccess: 1 });
		const m = w.families[0].members[0];
		m.hasElectricity = false;
		stepFamilies(w);
		stepFamilies(w);
		expect(m.hasElectricity).toBe(true);
		expect(m.lifeEvents.filter((e) => e.kind === 'electricity')).toHaveLength(1);
	});

	it('families do not claim a new connection when they begin with electricity', () => {
		const w = fixture({ electricityAccess: 1 });
		stepFamilies(w);
		expect(w.families[0].members[0].lifeEvents.some((e) => e.kind === 'electricity')).toBe(false);
	});

	it('occupations require the technologies that make them possible', () => {
		const roles = [];
		for (let seed = 1; seed <= 40; seed++) {
			const w = fixture({ urban: 1, litAny: 1, litSchool: 1 }, {}, []);
			const m = w.families[0].members[0];
			m.born = w.year - 18;
			m.canRead = true;
			// Exercise different real seeded family streams.
			for (let i = 0; i < seed; i++) w.familyRand();
			stepFamilies(w);
			roles.push(m.occupation);
		}
		expect(roles.every((role) => ['teacher', 'clerk', 'trader', 'artisan'].includes(role))).toBe(
			true
		);
	});

	it('family storytelling does not change national outcomes', () => {
		const a = fixture();
		const b = fixture();
		b.families = [];
		for (let i = 0; i < 25; i++) {
			stepWorld(a);
			stepWorld(b);
		}
		expect(a.history).toEqual(b.history);
		expect(a.events).toEqual(b.events);
	});

	it('shows electricity access in the HUD without inventing a historical reference', () => {
		const r = runSimulation(inputs(2018));
		const stat = statsAt(r, defaultData.national, 2018).find((s) => s.key === 'electricityAccess');
		expect(stat.ours).toBe(0.565);
		expect(stat.value).toBeGreaterThan(0);
		expect(formatStat(stat.key, stat.value)).toMatch(/%$/);
		const later = runSimulation(inputs(2020));
		expect(
			statsAt(later, defaultData.national, 2020).find((s) => s.key === 'electricityAccess').ours
		).toBeNull();
	});
});

describe('light public budget and river trade', () => {
	it('free schooling slows the grid while it is being built', () => {
		const at = (sw, year) => {
			const r = runSimulation({ seed: 3, startYear: 1850, endYear: year, switches: { ...defaultSwitches(), ...sw } });
			return r.history.at(-1).totals.electricityAccess;
		};
		expect(at({ freeSchoolingFromYear: 1960 }, 1985)).toBeLessThan(at({}, 1985));
	});
	it('states on the Niger or Benue get river trade', () => {
		const w = createWorld({ seed: 1, startYear: 1850, endYear: 1851, switches: defaultSwitches() });
		stepWorld(w);
		const kogi = w.cellById.get('kogi');
		expect(kogi.river).toBe(true);
		expect(kogi.marketAccess).toBeGreaterThan(0.2 + 0.5 * kogi.infra + 0.2 * kogi.urban + 0.07);
	});
});

describe('roads and markets', () => {
	// Mean gap between each place's roads and what its income keeps up, in 2025.
	const gap2025 = (startYear) => {
		const r = runSimulation({ seed: 7, switches: defaultSwitches(), startYear, endYear: 2025 });
		const cells = r.history.at(-1).cells;
		return cells.reduce((t, c) => t + Math.abs((c.incomeFactors.infrastructure - 1) / P.infraReturn - roadsFor(c.incomePc)), 0) / cells.length;
	};
	// Roads chase income at 3% of the gap a year, so some lag is expected; the old only-grow rule
	// left long runs about 0.3 above what income keeps up.
	it('settle at what income keeps up, in a long run and a short run alike', () => {
		expect(gap2025(1850)).toBeLessThan(0.15);
		expect(gap2025(2015)).toBeLessThan(0.15);
	});
});

describe('electricity follows causes', () => {
	const at2018 = (sw, seed = 3) => {
		const r = runSimulation({ seed, switches: { ...defaultSwitches(), ...sw }, startYear: 1850, endYear: 2018 });
		const y = r.history.at(-1);
		const cell = (id) => y.cells.find((c) => c.id === id);
		return { hours: (24 * y.totals.powerService) / y.totals.electricityAccess, lagos: cell('lagos').electricityAccess, sokoto: cell('sokoto').electricityAccess };
	};
	it('a steadier, cleaner government keeps the lights on longer', () => {
		const hours = (sw) => [1, 2, 3].reduce((t, seed) => t + at2018(sw, seed).hours, 0) / 3;
		expect(hours({ corruption: 'low' })).toBeGreaterThan(hours({ corruption: 'high' }) * 1.05);
	});
	it('crowded places are wired first, with no state named in the rule', () => {
		const h = at2018({});
		expect(h.lagos).toBeGreaterThan(h.sokoto + 0.2);
		expect(h.hours).toBeGreaterThan(6);
		expect(h.hours).toBeLessThan(16);
	});
});

describe('who takes what is made', () => {
	it('a colony sends part of its income abroad; the same land keeps it after independence or without conquest', () => {
		const run = (sw) => runSimulation({ seed: 2, switches: { ...defaultSwitches(), ...sw }, startYear: 1850, endYear: 1975 });
		const factor = (r, year) => r.history.find((h) => h.year === year).cells.find((c) => c.id === 'oyo').incomeFactors.colonial;
		const history = run({});
		expect(factor(history, 1930)).toBeCloseTo(1 - P.colonialDrain);
		expect(factor(history, 1975)).toBe(1);
		expect(factor(run({ britishConquest: false }), 1930)).toBe(1);
	});
});

describe('the seat of government', () => {
	it('earns more, and moves to Abuja in 1991 only where Nigeria exists', () => {
		const run = (sw) => runSimulation({ seed: 2, switches: { ...defaultSwitches(), ...sw }, startYear: 1850, endYear: 1995 });
		const history = run({});
		const at = (r, year, id) => r.history.find((h) => h.year === year).cells.find((c) => c.id === id).incomeFactors.capital;
		expect(at(history, 1985, 'lagos')).toBeCloseTo(1 + P.capitalPremium);
		expect(at(history, 1995, 'fct')).toBeCloseTo(1 + P.capitalPremium);
		expect(at(history, 1995, 'lagos')).toBe(1);
		expect(run({ britishConquest: false }).events.some((e) => e.id === 'capital-abuja')).toBe(false);
	});
});
