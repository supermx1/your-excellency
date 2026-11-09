// @ts-nocheck
// Wars between neighbouring polities: start from tension, weak states, a stronger neighbour's wish
// for land, and chance; fronts take damage; border cells change hands; a state that loses its last
// ground is conquered whole; a clear victory ends in a peace that cedes land. Same for every polity.
import { PARAMS as P } from '../params.js';

const TRUST = { low: 1.6, history: 1, high: 0.4 };

/** Polity pairs that share a border: Map "a|b" → { a, b, cells: border cell ids of both }. */
export function borders(world) {
	const out = new Map();
	for (const c of world.cells) {
		for (const nId of c.neighbours) {
			const n = world.cellById.get(nId);
			if (!n || n.polityId === c.polityId) continue;
			const [a, b] = [c.polityId, n.polityId].sort();
			const key = `${a}|${b}`;
			if (!out.has(key)) out.set(key, { a, b, cells: new Set() });
			out.get(key).cells.add(c.id).add(n.id);
		}
	}
	return out;
}

const strength = (world, p) =>
	p.cellIds.reduce((s, id) => s + world.cellById.get(id).pop, 0) *
	p.army *
	(0.5 + p.stability) *
	(1 + p.knowledge / 4);

/**
 * How much `p` wants to take land from neighbour `q`, 0–1: its edge in strength, times how settled
 * it is at home, times how crowded its land is (food stress). Zero unless p is the stronger side.
 */
export function ambition(world, p, q) {
	const sp = strength(world, p);
	const edge = Math.max(0, (2 * sp) / (sp + strength(world, q) || 1) - 1);
	const crowding =
		p.cellIds.reduce((s, id) => s + (world.cellById.get(id).foodStress ?? 0), 0) / p.cellIds.length;
	return edge * p.stability * Math.min(1, 0.5 + crowding);
}

const nameOf = (world, id) => world.cellById.get(id).name ?? id;

/** The verb that agrees with a polity's name: "Middle Belt peoples conquer", "Sokoto Caliphate conquers". */
export const verb = (name, singular, plural) =>
	/(peoples|communities|territories)$/.test(name) ? plural : singular;

/** @param {import('../types.js').World} world */
export function stepConflict(world) {
	world.wars ??= [];
	for (const c of world.cells) c.warDamage *= 0.5;
	const byId = new Map(world.polities.map((p) => [p.id, p]));
	const trust = TRUST[world.switches.trust ?? 'history'];
	const front = borders(world);

	// ongoing wars
	for (const war of world.wars.filter((w) => !w.ended)) {
		const alive = (id) => world.polities.find((p) => p.id === id);
		const a = alive(war.a);
		const b = alive(war.b);
		if (a && b && (!a.atWarWith.includes(b.id) || !b.atWarWith.includes(a.id))) {
			endWar(world, war, null, 'collapse');
			continue;
		}
		const key = [war.a, war.b].sort().join('|');
		if (!a || !b || !front.has(key)) {
			endWar(world, war, a ?? b, 'collapse');
			continue;
		}
		const cells = [...front.get(key).cells].map((id) => world.cellById.get(id));
		for (const c of cells) c.warDamage = Math.max(c.warDamage, war.intensity);
		war.deaths += cells.reduce((s, c) => s + c.pop * P.warDeath * war.intensity, 0);
		war.years += 1;

		const sa = strength(world, a);
		const sb = strength(world, b);
		const share = sa / (sa + sb || 1);
		const [winner, loser, edge] = world.rand() < share ? [a, b, share] : [b, a, 1 - share];
		war.wins ??= { [war.a]: 0, [war.b]: 0 };
		war.wins[winner.id] += 1;
		if (world.rand() < 0.3) {
			const front = cells.filter((c) => c.polityId === loser.id);
			const taken = front.find((c) => c.id !== loser.capitalCell);
			// The capital falls only to a clearly stronger side that has won at least 3 years of this war;
			// then the whole state goes.
			if (taken && loser.cellIds.length > 1) capture(world, war, winner, loser, taken);
			else if (front.length && edge > 0.6 && war.wins[winner.id] >= 3) {
				conquer(world, war, winner, loser);
				continue;
			}
		}
		if (war.years >= (war.minYears ?? 0) && world.rand() < 0.15 + 0.05 * war.years) {
			const [wa, wb] = [war.wins[war.a], war.wins[war.b]];
			const victor = wa === wb ? null : wa > wb ? a : b;
			if (victor && Math.max(wa, wb) / war.years >= 0.7 && !war.reabsorb)
				cede(world, war, victor, victor === a ? b : a, cells);
			endWar(world, war, victor ?? winner, 'peace');
		}
	}

	// new wars
	for (const { a, b, cells } of front.values()) {
		const pa = byId.get(a);
		const pb = byId.get(b);
		if (!pa || !pb || pa.atWarWith.includes(b)) continue;
		const borderCells = [...cells].map((id) => world.cellById.get(id));
		const tension = borderCells.reduce((s, c) => s + c.tension, 0) / borderCells.length;
		const weakness = 1 - (pa.stability + pb.stability) / 2;
		const [ra, rb] = [ambition(world, pa, pb), ambition(world, pb, pa)];
		const chance =
			(P.warBase +
				P.warTension * tension +
				P.warWeakness * weakness +
				P.warAmbition * Math.max(ra, rb)) *
			trust;
		if (world.rand() < chance) {
			// The side that wants land more is the one that attacks.
			const [att, def] = rb > ra ? [pb, pa] : [pa, pb];
			const wants = Math.max(ra, rb) > 0.25;
			startWar(
				world,
				att,
				def,
				0.3 + 0.4 * world.rand(),
				wants
					? `${att.name} ${verb(att.name, 'attacks', 'attack')} ${def.name} for land`
					: undefined
			);
		}
	}
}

/** Starts a war between two polities and records it. Also used by history events. */
export function startWar(world, a, b, intensity, title) {
	world.wars ??= [];
	const war = {
		warId: `w${world.wars.length + 1}`,
		a: a.id,
		b: b.id,
		start: world.year,
		years: 0,
		deaths: 0,
		intensity
	};
	world.wars.push(war);
	a.atWarWith.push(b.id);
	b.atWarWith.push(a.id);
	world.events.push({
		year: world.year,
		kind: 'war',
		warId: war.warId,
		polityIds: [a.id, b.id],
		title: title ?? `War between ${a.name} and ${b.name}`
	});
	return war;
}

function endWar(world, war, winner, how) {
	war.ended = world.year;
	for (const p of world.polities) {
		if (p.id === war.a) p.atWarWith = p.atWarWith.filter((x) => x !== war.b);
		if (p.id === war.b) p.atWarWith = p.atWarWith.filter((x) => x !== war.a);
	}
	if (war.reabsorb && winner?.id === war.a) {
		const rebel = world.polities.find((p) => p.id === war.b);
		for (const id of [...(rebel?.cellIds ?? [])])
			transferCell(world, world.cellById.get(id), winner);
		world.polities = world.polities.filter((p) => p.cellIds.length);
	}
	world.events.push({
		year: world.year,
		kind: 'peace',
		warId: war.warId,
		polityIds: [war.a, war.b],
		winner: winner?.id,
		deaths: Math.round(war.deaths),
		...(war.ceded && { ceded: war.ceded }),
		title:
			how === 'collapse'
				? 'A war ends as one side collapses'
				: war.ceded
					? `Peace: ${war.cededBy} ${verb(war.cededBy, 'cedes', 'cede')} ${war.ceded.map((id) => nameOf(world, id)).join(' and ')} to ${winner.name}`
					: `Peace${winner ? `, ${winner.name} ${verb(winner.name, 'prevails', 'prevail')}` : ''}`
	});
}

/** One state changes hands in battle. */
function capture(world, war, winner, loser, cell) {
	transferCell(world, cell, winner);
	world.events.push({
		year: world.year,
		kind: 'conquest',
		warId: war.warId,
		polityIds: [winner.id, loser.id],
		cellIds: [cell.id],
		title: `${winner.name} ${verb(winner.name, 'takes', 'take')} ${nameOf(world, cell.id)} from ${loser.name}`
	});
}

/** The loser's capital falls and the winner takes all of it. */
function conquer(world, war, winner, loser) {
	const cellIds = [...loser.cellIds];
	for (const id of cellIds) transferCell(world, world.cellById.get(id), winner);
	world.polities = world.polities.filter((p) => p.cellIds.length);
	world.events.push({
		year: world.year,
		kind: 'conquest',
		annexed: true,
		warId: war.warId,
		polityIds: [winner.id, loser.id],
		cellIds,
		title: `${winner.name} ${verb(winner.name, 'conquers', 'conquer')} ${loser.name}`
	});
	endWar(world, war, winner, 'collapse');
}

/** A clear victory: the loser gives up one more state on the front (never its capital). */
function cede(world, war, victor, loser, front) {
	const cell =
		loser.cellIds.length > 1 &&
		front.find((c) => c.polityId === loser.id && c.id !== loser.capitalCell);
	if (!cell) return;
	transferCell(world, cell, victor);
	war.ceded = [cell.id];
	war.cededBy = loser.name;
}

/** Moves a cell to another polity, keeping cellIds consistent. */
export function transferCell(world, cell, to) {
	const from = world.polities.find((p) => p.id === cell.polityId);
	// Power stations stand on the land: a place that changes hands takes its share of the grid,
	// in proportion to the people connected there. Supply is neither made nor lost.
	if (from?.powerSupply != null && from !== to) {
		const demand = from.cellIds.reduce((s, id) => {
			const c = world.cellById.get(id);
			return s + c.pop * c.electricityAccess;
		}, 0);
		const moved = demand > 0 ? (from.powerSupply * cell.pop * cell.electricityAccess) / demand : 0;
		from.powerSupply -= moved;
		to.powerSupply = (to.powerSupply ?? 0) + moved;
	}
	if (from) {
		from.cellIds = from.cellIds.filter((id) => id !== cell.id);
		if (from.capitalCell === cell.id) from.capitalCell = from.cellIds[0] ?? null;
	}
	to.cellIds.push(cell.id);
	cell.polityId = to.id;
}
