// @ts-nocheck
// The Timeline engine core: a Mesa-like world stepped once per year.
import { hashString, rng } from '../engine.js';
import { stepEvents } from './rules/events.js';
import { stepPolities } from './rules/polities.js';
import { stepConflict } from './rules/conflict.js';
import { stepReligion } from './rules/religion.js';
import { stepTech } from './rules/tech.js';
import { stepEconomy, roadsFor } from './rules/economy.js';
import { stepDemography } from './rules/demography.js';
import { stepFamilies, createFamilies } from './rules/families.js';
import { defaultData } from './data/index.js';
import { PARAMS as P } from './params.js';
import { populationAt } from './population.js';
import { stepLivelihoods } from './rules/livelihoods.js';

export const ENGINE_VERSION = 16;

const RULES = [
	stepEvents,
	stepPolities,
	stepConflict,
	stepReligion,
	stepTech,
	stepEconomy,
	stepLivelihoods,
	stepDemography,
	stepFamilies
];

const round = (n, p = 4) => Math.round(n * 10 ** p) / 10 ** p;

/** Population and religion for a cell at the start year, from the regional data (if present). */
function startingCell(id, year, data, populations) {
	if (!data.regional) return {};
	const r0 = data.regional.religion[1850][id];
	const r1 = data.regional.religion[2018][id];
	const t = Math.min(1, Math.max(0, (year - 1850) / (2018 - 1850)));
	const mix = (k) => r0[k] * (1 - t) + r1[k] * t;
	return {
		pop: populations[id],
		religion: { islam: mix('islam'), christian: mix('christian'), traditional: mix('traditional') }
	};
}

/**
 * The polity map, flags and real conditions at the start year. 1850 starts use the 1850 polities;
 * later starts use the latest real-borders snapshot and real national averages for that year.
 */
function startingMap(inputs, data) {
	const year = inputs.startYear;
	const sw = inputs.switches ?? {};
	// A run starting mid-war (Biafra, 1967–70) begins from the last peacetime borders.
	const snap = (data.realBorders ?? []).filter((s) => s.year > 1850 && s.year <= year && !s.atWar).at(-1);
	if (!snap) return { polities: data.polities ?? [], flags: {}, cellDefaults: {} };

	const at = (key) => data.national[key]?.[data.national.years.indexOf(year)] ?? null;
	const known = (data.tech ?? [])
		.filter((t) => t.nigeriaYear != null && t.nigeriaYear <= year)
		.map((t) => t.id);
	const litSchool = at('litSchool') ?? 0.02;
	const british = snap.polities.filter((p) => p.british && p.id !== 'nigeria');
	const merged =
		british.length > 1
			? [
					...snap.polities.filter((p) => !british.includes(p)),
					{
						id: 'british',
						name: 'British territories',
						british: true,
						cellIds: british.flatMap((p) => p.cellIds)
					}
				]
			: snap.polities;
	const polities = merged.map((p) => ({
		...p,
		capitalCell:
			p.id === 'nigeria'
				? year >= 1991
					? 'fct'
					: 'lagos'
				: p.cellIds.includes('lagos')
					? 'lagos'
					: p.cellIds[0],
		government: p.british ? 'colony' : year >= 1960 ? 'federation' : 'monarchy',
		tech: known,
		knowledge: 1 + 0.05 * known.length + 2 * litSchool
	}));
	const nigeriaExists = polities.some((p) => p.id === 'nigeria');
	return {
		polities,
		flags: {
			britishRule: polities.some((p) => p.british),
			nigeriaExists,
			independent: nigeriaExists && year >= (sw.independenceYear ?? 1960),
			independentYear: sw.independenceYear ?? 1960,
			oilFound:
				sw.oilInGround !== false && sw.oilDiscovery !== false && year >= (sw.oilYear ?? 1956)
		},
		cellDefaults: Object.fromEntries(
			Object.entries({
				litSchool,
				litAny: Math.min(1, litSchool * 1.25),
				lifeExp: at('lifeExp'),
				urban: at('urban'),
				incomePc: at('gdpPc'),
				schools: { quranic: 0.1, mission: litSchool * 0.4, state: litSchool * 0.6 }
			}).filter(([, v]) => v != null)
		)
	};
}

/** Defaults for every Cell field so rules can rely on them. */
function makeCell(src, polityId) {
	return {
		urban: 0.05,
		litAny: 0.02,
		litSchool: 0.005,
		lifeExp: 28,
		incomePc: 700,
		infra: 0.02,
		electricityAccess: 0,
		powerService: 0,
		schoolExpansion: 0,
		developmentYear: null,
		foodBuffer: 0.4,
		foodStress: 0,
		harvestShock: 0,
		marketAccess: 0.2,
		netMigration: 0,
		incomeFactors: null,
		warDamage: 0,
		tension: 0,
		religion: { islam: 0, christian: 0, traditional: 1 },
		schools: { quranic: 0, mission: 0, state: 0 },
		...structuredClone(src),
		polityId,
		mods: { mortality: 1, productivity: 1, learning: 1 }
	};
}

function makePolity(src) {
	return {
		government: 'monarchy',
		stateReligion: null,
		treasury: 0,
		army: 0.02,
		stability: 0.6,
		knowledge: 1,
		tech: [],
		atWarWith: [],
		...structuredClone(src)
	};
}

/**
 * @param {import('./types.js').RunInputs} inputs
 * @param {any} data
 * @returns {import('./types.js').World}
 */
export function createWorld(inputs, data = defaultData) {
	const start = startingMap(inputs, data);
	const polities = start.polities.map(makePolity);
	const owner = new Map(polities.flatMap((p) => p.cellIds.map((c) => [c, p.id])));
	const populations = populationAt(data, inputs.startYear);
	const cells = data.cells.map((c) =>
		makeCell(
			{ ...startingCell(c.id, inputs.startYear, data, populations), ...start.cellDefaults, ...c },
			owner.get(c.id) ?? null
		)
	);
	// Evidence initializes a run only. Never pull the evolving counterfactual back to history.
	const observed = (data.development?.snapshots ?? [])
		.filter((s) => s.year <= inputs.startYear)
		.at(-1);
	for (const [index, c] of cells.entries()) {
		c.infra = roadsFor(c.incomePc); // roads start at what the starting income keeps up
		const profile = observed?.cells[c.id];
		const polity = polities.find((p) => p.id === c.polityId);
		if (profile) {
			c.electricityAccess = profile.electricityAccess.value;
			const formal = c.schools.mission + c.schools.state;
			const missionShare = formal > 0 ? c.schools.mission / formal : 0;
			// Attendance is a proxy for formal learning capacity, not an adult-literacy value.
			c.schools.mission = profile.primaryAttendance.value * missionShare;
			c.schools.state = profile.primaryAttendance.value * (1 - missionShare);
			c.developmentYear = observed.year;
			const policy = inputs.switches?.freeSchoolingFromYear;
			if (policy != null && inputs.startYear >= policy) {
				// Observed attendance already includes free schooling: count it as built, not on top.
				const built = Math.min(P.schoolPolicyCoverage, formal ? profile.primaryAttendance.value : 0);
				const keep = profile.primaryAttendance.value ? 1 - built / profile.primaryAttendance.value : 1;
				c.schools.mission *= keep;
				c.schools.state *= keep;
				c.schoolExpansion = built;
			}
		} else if (data.cells[index].electricityAccess == null && polity?.tech.includes('electricity'))
			c.electricityAccess = c.infra;
		c.powerService = c.electricityAccess * P.powerReliability;
	}
	const world = {
		year: inputs.startYear,
		rand: rng(hashString(`timeline:${inputs.seed}`)),
		familyRand: rng(hashString(`timeline-families:${inputs.seed}`)),
		cells,
		cellById: new Map(cells.map((c) => [c.id, c])),
		polities,
		families: [],
		events: [],
		history: [],
		switches: inputs.switches ?? {},
		flags: { ...start.flags, ...(data.startFlags ?? {}) },
		missionCells: new Set(), // where missionaries work: dated landings, then spread by contact
		inputs,
		data
	};
	world.families = createFamilies(world);
	return world;
}

/** @param {import('./types.js').World} world */
export function snapshot(world) {
	const pop = world.cells.reduce((s, c) => s + c.pop, 0) || 1;
	const w = (key) => world.cells.reduce((s, c) => s + c[key] * c.pop, 0) / pop;
	return {
		year: world.year,
		cells: world.cells.map((c) => ({
			id: c.id,
			polityId: c.polityId,
			pop: Math.round(c.pop),
			urban: round(c.urban),
			litAny: round(c.litAny),
			litSchool: round(c.litSchool),
			lifeExp: round(c.lifeExp, 1),
			incomePc: Math.round(c.incomePc),
			electricityAccess: round(c.electricityAccess),
			powerService: round(c.powerService),
			schoolExpansion: round(c.schoolExpansion),
			foodStress: round(c.foodStress),
			foodBuffer: round(c.foodBuffer),
			marketAccess: round(c.marketAccess),
			netMigration: Math.round(c.netMigration),
			incomeFactors:
				c.incomeFactors &&
				Object.fromEntries(Object.entries(c.incomeFactors).map(([k, v]) => [k, round(v)])),
			tension: round(c.tension),
			religion: {
				islam: round(c.religion.islam),
				christian: round(c.religion.christian),
				traditional: round(c.religion.traditional)
			}
		})),
		polities: world.polities.map((p) => ({
			id: p.id,
			name: p.name,
			capitalCell: p.capitalCell,
			cellIds: [...p.cellIds]
		})),
		totals: {
			pop: Math.round(pop),
			litAny: round(w('litAny')),
			litSchool: round(w('litSchool')),
			lifeExp: round(w('lifeExp'), 1),
			urban: round(w('urban')),
			electricityAccess: round(w('electricityAccess')),
			powerService: round(w('powerService')),
			incomePc: Math.round(w('incomePc')),
			foodStress: round(w('foodStress')),
			wars: world.polities.reduce((s, p) => s + p.atWarWith.length, 0) / 2
		}
	};
}

/** Record the current year, then advance one year by running every rule. */
/** @param {import('./types.js').World} world */
export function stepWorld(world) {
	const sw = world.switches;
	const mortality = (sw.health ?? 1) * (sw.malaria ?? 1) ** 0.4;
	for (const c of world.cells) c.mods = { mortality, productivity: 1, learning: sw.learning ?? 1 };
	world.oilPrice = 1;
	for (const rule of RULES) rule(world);
	// Keep war links two-sided after unions, secessions and conquests removed or renamed polities.
	const ids = new Set(world.polities.map((p) => p.id));
	const byId = new Map(world.polities.map((p) => [p.id, p]));
	for (const p of world.polities)
		p.atWarWith = p.atWarWith.filter(
			(x) => x !== p.id && ids.has(x) && byId.get(x).atWarWith.includes(p.id)
		);
	world.year += 1;
	world.history.push(snapshot(world));
}

/**
 * @param {import('./types.js').RunInputs} inputs
 * @param {any} data
 * @returns {import('./types.js').RunResult}
 */
export function runSimulation(inputs, data = defaultData) {
	const world = createWorld(inputs, data);
	world.history.push(snapshot(world));
	while (world.year < inputs.endYear) stepWorld(world);
	return {
		engineVersion: ENGINE_VERSION,
		inputs,
		history: world.history,
		events: world.events,
		families: world.families
	};
}
