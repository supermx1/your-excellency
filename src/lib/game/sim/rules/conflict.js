// @ts-nocheck
// Wars between neighbouring polities: start from tension, crowding, weak states and chance;
// fronts take damage; border cells change hands; wars end from exhaustion or chance.
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
	p.cellIds.reduce((s, id) => s + world.cellById.get(id).pop, 0) * p.army * (0.5 + p.stability) * (1 + p.knowledge / 4);

/** @param {import('../types.js').World} world */
export function stepConflict(world) {
	world.wars ??= [];
	for (const c of world.cells) c.warDamage *= 0.5;
	const byId = new Map(world.polities.map((p) => [p.id, p]));
	const trust = TRUST[world.switches.trust ?? 'history'];
	const front = borders(world);

	// ongoing wars
	for (const war of world.wars.filter((w) => !w.ended)) {
		const a = byId.get(war.a);
		const b = byId.get(war.b);
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
		const [winner, loser] = world.rand() < sa / (sa + sb) ? [a, b] : [b, a];
		if (world.rand() < 0.3) {
			const taken = loser.cellIds.length > 1 && cells.find((c) => c.polityId === loser.id && c.id !== loser.capitalCell);
			if (taken) transferCell(world, taken, winner);
		}
		if (war.years >= (war.minYears ?? 0) && world.rand() < 0.15 + 0.05 * war.years) endWar(world, war, winner, 'peace');
	}

	// new wars
	for (const { a, b, cells } of front.values()) {
		const pa = byId.get(a);
		const pb = byId.get(b);
		if (!pa || !pb || pa.atWarWith.includes(b)) continue;
		const borderCells = [...cells].map((id) => world.cellById.get(id));
		const tension = borderCells.reduce((s, c) => s + c.tension, 0) / borderCells.length;
		const weakness = 1 - (pa.stability + pb.stability) / 2;
		const chance = (P.warBase + P.warTension * tension + P.warWeakness * weakness) * trust;
		if (world.rand() < chance) startWar(world, pa, pb, 0.3 + 0.4 * world.rand());
	}
}

/** Starts a war between two polities and records it. Also used by history events. */
export function startWar(world, a, b, intensity, title) {
	world.wars ??= [];
	const war = { warId: `w${world.wars.length + 1}`, a: a.id, b: b.id, start: world.year, years: 0, deaths: 0, intensity };
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
		for (const id of [...(rebel?.cellIds ?? [])]) transferCell(world, world.cellById.get(id), winner);
		world.polities = world.polities.filter((p) => p.cellIds.length);
	}
	world.events.push({
		year: world.year,
		kind: 'peace',
		warId: war.warId,
		polityIds: [war.a, war.b],
		winner: winner?.id,
		deaths: Math.round(war.deaths),
		title: how === 'collapse' ? 'A war ends as one side collapses' : `Peace${winner ? `, ${winner.name} prevails` : ''}`
	});
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
