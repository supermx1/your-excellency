// @ts-nocheck
// The Timeline engine core: a Mesa-like world stepped once per year.
import { hashString, rng } from '../engine.js';
import { stepEvents } from './rules/events.js';
import { stepPolities } from './rules/polities.js';
import { stepConflict } from './rules/conflict.js';
import { stepReligion } from './rules/religion.js';
import { stepTech } from './rules/tech.js';
import { stepEconomy } from './rules/economy.js';
import { stepDemography } from './rules/demography.js';
import { stepFamilies } from './rules/families.js';
import { defaultData } from './data/index.js';

export const ENGINE_VERSION = 1;

const RULES = [
	stepEvents,
	stepPolities,
	stepConflict,
	stepReligion,
	stepTech,
	stepEconomy,
	stepDemography,
	stepFamilies
];

const round = (n, p = 4) => Math.round(n * 10 ** p) / 10 ** p;

/** Population and religion for a cell at the start year, from the regional data (if present). */
function startingCell(id, year, data) {
	if (!data.regional) return {};
	const years = Object.keys(data.regional.pop).map(Number).filter((y) => y <= year);
	const base = Math.max(...years);
	const natIdx = data.national.years.indexOf(year);
	const scale = data.national.pop[natIdx] / data.national.pop[data.national.years.indexOf(base)];
	const r0 = data.regional.religion[1850][id];
	const r1 = data.regional.religion[2018][id];
	const t = Math.min(1, Math.max(0, (year - 1850) / (2018 - 1850)));
	const mix = (k) => r0[k] * (1 - t) + r1[k] * t;
	return {
		pop: data.regional.pop[base][id] * scale,
		religion: { islam: mix('islam'), christian: mix('christian'), traditional: mix('traditional') }
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
		warDamage: 0,
		tension: 0,
		religion: { islam: 0, christian: 0, traditional: 1 },
		schools: { quranic: 0, western: 0 },
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
	const polities = (data.polities ?? []).map(makePolity);
	const owner = new Map(polities.flatMap((p) => p.cellIds.map((c) => [c, p.id])));
	const cells = data.cells.map((c) => makeCell({ ...startingCell(c.id, inputs.startYear, data), ...c }, owner.get(c.id) ?? null));
	return {
		year: inputs.startYear,
		rand: rng(hashString(`timeline:${inputs.seed}`)),
		cells,
		cellById: new Map(cells.map((c) => [c.id, c])),
		polities,
		families: [],
		events: [],
		history: [],
		switches: inputs.switches ?? {},
		flags: {},
		inputs,
		data
	};
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
			religion: {
				islam: round(c.religion.islam),
				christian: round(c.religion.christian),
				traditional: round(c.religion.traditional)
			}
		})),
		polities: world.polities.map((p) => ({ id: p.id, name: p.name, cellIds: [...p.cellIds] })),
		totals: {
			pop: Math.round(pop),
			litAny: round(w('litAny')),
			litSchool: round(w('litSchool')),
			lifeExp: round(w('lifeExp'), 1),
			urban: round(w('urban')),
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
