// @ts-nocheck
// Religion: one symmetric rule set for every faith. A faith spreads through neighbours,
// the state, and its own schools; difference between and within cells creates tension,
// scaled by the tolerance switch. The only faith names here map each faith to its kind
// of school; no rate, weight or effect differs by faith.
import { PARAMS as P } from '../params.js';

export const FAITHS = ['islam', 'christian', 'traditional'];
/** Which school kind a faith runs (traditional religions run none). */
const SCHOOL_OF = { islam: 'quranic', christian: 'mission' };
const TOLERANCE = { low: 0.2, history: 0.5, high: 0.85 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const diff = (a, b) => FAITHS.reduce((s, f) => s + Math.abs(a[f] - b[f]), 0) / 2;

/**
 * How open is this place to missionaries of this faith (0–1)? A ruler whose state faith runs schools
 * of its own keeps them out; under indirect rule the local rulers keep them away from the people who
 * hold such a faith, so they get in only as far as other people live there. Same for every faith.
 */
function openTo(cell, faith, polity) {
	const guards = (f) => f != null && f !== faith && SCHOOL_OF[f] != null;
	if (guards(polity?.stateReligion)) return 0;
	if (!cell.indirectRule) return 1;
	return 1 - FAITHS.filter(guards).reduce((t, f) => t + cell.religion[f], 0);
}

/** Missionaries move on from where they work into open neighbouring places, a few years per step. */
function spreadMissions(world, polityById) {
	if (world.switches.christianMissions === false || !world.missionCells?.size) return;
	const arrive = [];
	for (const c of world.cells) {
		if (world.missionCells.has(c.id)) continue;
		const near = c.neighbours.filter((id) => world.missionCells.has(id)).length;
		c.missionContact = (c.missionContact ?? 0) + P.missionSpread * near * openTo(c, 'christian', polityById.get(c.polityId));
		if (c.missionContact >= 1) arrive.push(c.id);
	}
	for (const id of arrive) world.missionCells.add(id);
}

/** @param {import('../types.js').World} world */
export function stepReligion(world) {
	const sw = world.switches;
	const tolerance = TOLERANCE[sw.religiousTolerance ?? 'history'];
	const polityById = new Map(world.polities.map((p) => [p.id, p]));

	if (sw.stateReligion === 'secular') for (const p of world.polities) p.stateReligion = null;
	spreadMissions(world, polityById);
	if (sw.stateReligion === 'choose' && world.year % 25 === 0)
		for (const p of world.polities) p.stateReligion = majorityFaith(world, p);

	const next = world.cells.map((c) => {
		const neighbours = c.neighbours.map((id) => world.cellById.get(id)).filter(Boolean);
		const state = polityById.get(c.polityId)?.stateReligion;
		const pull = {};
		for (const f of FAITHS) {
			const nb = neighbours.length ? neighbours.reduce((s, n) => s + n.religion[f], 0) / neighbours.length : c.religion[f];
			const school = SCHOOL_OF[f] ? c.schools[SCHOOL_OF[f]] : 0;
			pull[f] = c.religion[f] + P.relNeighbour * nb + P.relState * (state === f ? 1 : 0) + P.relSchool * school;
			if (f === 'christian' && sw.christianMissions === false) pull[f] = c.religion[f];
		}
		const total = FAITHS.reduce((s, f) => s + pull[f], 0) || 1;
		const religion = {};
		for (const f of FAITHS) religion[f] = c.religion[f] + P.relRate * (pull[f] / total - c.religion[f]);

		const within = 1 - FAITHS.reduce((s, f) => s + religion[f] ** 2, 0);
		const across = neighbours.length ? neighbours.reduce((s, n) => s + diff(c.religion, n.religion), 0) / neighbours.length : 0;
		const sharia = world.flags.shariaNorth && (world.data.events?.groups?.north ?? []).includes(c.id) ? 0.1 : 0;
		const tension = clamp((0.5 * within + 0.5 * across + sharia) * (1 - tolerance), 0, 1);
		return { religion, tension };
	});

	world.cells.forEach((c, i) => {
		const s = FAITHS.reduce((t, f) => t + next[i].religion[f], 0) || 1;
		for (const f of FAITHS) c.religion[f] = clamp(next[i].religion[f] / s, 0, 1);
		c.tension = next[i].tension;
		const funding = 1 + c.incomePc / 3000;
		for (const f of Object.keys(SCHOOL_OF)) {
			const kind = SCHOOL_OF[f];
			// Every faith's schools grow from its local believers; missionaries from abroad add teachers where they work.
			const missionaries = f === 'christian' && world.missionCells?.has(c.id) ? P.missionPresence : 0;
			const teachers = Math.max(c.religion[f], missionaries);
			const grow = P.schoolGrowth * teachers * funding;
			c.schools[kind] = clamp(c.schools[kind] + grow * (1 - c.schools[kind]) - 0.01 * c.warDamage, 0, 1);
		}
	});
}

/** @param {import('../types.js').World} world @param {import('../types.js').Polity} polity */
function majorityFaith(world, polity) {
	const sum = Object.fromEntries(FAITHS.map((f) => [f, 0]));
	for (const id of polity.cellIds) {
		const c = world.cellById.get(id);
		for (const f of FAITHS) sum[f] += c.religion[f] * c.pop;
	}
	return FAITHS.reduce((a, b) => (sum[b] > sum[a] ? b : a));
}
