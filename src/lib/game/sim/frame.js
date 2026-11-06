// @ts-nocheck
// The state shown at a fractional year: snapshots interpolated, plus war fronts and epidemics.
import { defaultData } from './data/index.js';

const NUMERIC = [
	'pop',
	'urban',
	'litAny',
	'litSchool',
	'lifeExp',
	'incomePc',
	'tension',
	'electricityAccess',
	'powerService',
	'schoolExpansion'
];
const neighbours = new Map(defaultData.cells.map((c) => [c.id, c.neighbours]));
const lerp = (a, b, t) => a + (b - a) * t;

/** Cells hit by a world event with a mortality effect in `year`. */
function epidemicCells(run, year) {
	const groups = defaultData.events.groups;
	const hit = new Set();
	for (const e of run.events) {
		if (e.year !== year || e.kind !== 'world') continue;
		const spec = defaultData.events.events.find((x) => x.id === e.id)?.effects?.mortality?.cells;
		if (!spec) continue;
		const ids =
			spec === 'all'
				? [...neighbours.keys()]
				: typeof spec === 'string'
					? (groups[spec] ?? [])
					: spec;
		for (const id of ids) hit.add(id);
	}
	return hit;
}

/** Pairs of polities at war during `year` (from war/peace events). */
function warsDuring(run, year) {
	const wars = [];
	for (const e of run.events) {
		if (e.kind !== 'war' || e.year > year) continue;
		const peace = run.events.find((p) => p.kind === 'peace' && p.warId === e.warId);
		if (!peace || peace.year >= year) wars.push(e.polityIds);
	}
	return wars;
}

/**
 * @param {import('./types.js').RunResult} run
 * @param {number} year fractional year
 */
export function frameAt(run, year) {
	const first = run.history[0].year;
	const last = run.history.at(-1).year;
	const y = Math.min(last, Math.max(first, year));
	const i = Math.min(run.history.length - 1, Math.floor(y - first));
	const a = run.history[i];
	const b = run.history[Math.min(i + 1, run.history.length - 1)];
	const t = y - a.year;
	const bById = new Map(b.cells.map((c) => [c.id, c]));
	const owner = new Map(a.cells.map((c) => [c.id, c.polityId]));
	const wars = warsDuring(run, a.year);
	const sick = epidemicCells(run, a.year);

	const cells = a.cells.map((ca) => {
		const cb = bById.get(ca.id) ?? ca;
		const cell = {
			id: ca.id,
			polityId: ca.polityId,
			nextPolityId: cb.polityId,
			religion: ca.religion
		};
		for (const k of NUMERIC) cell[k] = lerp(ca[k] ?? 0, cb[k] ?? 0, t);
		cell.warFront = wars.some(
			([p, q]) =>
				(ca.polityId === p || ca.polityId === q) &&
				(neighbours.get(ca.id) ?? []).some((n) => owner.get(n) === (ca.polityId === p ? q : p))
		);
		cell.epidemic = sick.has(ca.id);
		return cell;
	});

	const totals = {};
	for (const k of Object.keys(a.totals)) totals[k] = lerp(a.totals[k], b.totals[k], t);
	return {
		year: y,
		yearInt: a.year,
		t,
		cells,
		polities: a.polities,
		wars,
		totals,
		events: run.events.filter((e) => e.year === a.year)
	};
}
