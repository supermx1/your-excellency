// @ts-nocheck
// Polities: stability, armies, coups, secessions and unions. Same rules for every polity.
import { PARAMS as P } from '../params.js';
import { borders, transferCell } from './conflict.js';

const COUPS = { off: 0, history: 0.5, likely: 2 };
const TRUST = { low: 1.5, history: 1, high: 0.5 };
const CORRUPTION = { low: 0.05, history: 0, high: -0.08 };

const cellsOf = (world, p) => p.cellIds.map((id) => world.cellById.get(id));
const avg = (xs, f) => (xs.length ? xs.reduce((s, x) => s + f(x), 0) / xs.length : 0);

/** @param {import('../types.js').World} world */
export function stepPolities(world) {
	const sw = world.switches;
	const coupMult = COUPS[sw.coups ?? 'history'];
	const splitMult = TRUST[sw.trust ?? 'history'];

	for (const p of world.polities) {
		const cells = cellsOf(world, p);
		const tension = avg(cells, (c) => c.tension);
		const income = avg(cells, (c) => c.incomePc);
		const target =
			0.55 + 0.15 * Math.min(1, Math.log10(income / 500)) - 0.5 * tension - 0.15 * (p.atWarWith.length > 0) +
			CORRUPTION[sw.corruption ?? 'history'];
		p.stability = Math.min(1, Math.max(0, p.stability + (target - p.stability) * 0.15 + (world.rand() - 0.5) * 0.04));
		p.army = 0.015 + 0.02 * (p.atWarWith.length > 0);

		if (coupMult && world.rand() < P.coupBase * coupMult * (1 - p.stability)) coup(world, p);
		else if (p.government === 'military' && world.rand() < 0.06) setGovernment(world, p, 'republic', 'Civilian rule returns');
	}

	// secessions: an unstable polity loses its most tense non-capital cell and like-minded neighbours
	for (const p of [...world.polities]) {
		if (p.cellIds.length < 3 || p.stability > 0.35) continue;
		if (world.rand() > P.secessionBase * splitMult * (1 - p.stability)) continue;
		secede(world, p);
	}

	// unions: two stable, peaceful neighbours with little tension between them merge
	for (const { a, b, cells } of borders(world).values()) {
		const pa = world.polities.find((p) => p.id === a);
		const pb = world.polities.find((p) => p.id === b);
		if (!pa || !pb || pa.atWarWith.includes(b)) continue;
		const tension = avg([...cells].map((id) => world.cellById.get(id)), (c) => c.tension);
		if (pa.stability < 0.6 || pb.stability < 0.6 || tension > 0.3) continue;
		if (world.rand() < P.unionBase / splitMult) unite(world, pa, pb);
	}

	world.polities = world.polities.filter((p) => p.cellIds.length > 0);
	for (const p of world.polities) if (!p.cellIds.includes(p.capitalCell)) p.capitalCell = p.cellIds[0];
}

export function coup(world, p) {
	setGovernment(world, p, 'military', `Military coup in ${p.name}`, 'coup');
	p.stability = Math.max(0, p.stability - 0.1);
}

function setGovernment(world, p, government, title, kind = 'government') {
	p.government = government;
	world.events.push({ year: world.year, kind, polityIds: [p.id], title });
}

/** Splits off `cellIds` (or the most tense cell and its tense neighbours) as a new polity. */
export function secede(world, p, cellIds, name) {
	const cells = cellsOf(world, p);
	let leaving = cellIds;
	if (!leaving) {
		const seed = cells.filter((c) => c.id !== p.capitalCell).sort((x, y) => y.tension - x.tension)[0];
		if (!seed) return null;
		leaving = [seed.id, ...seed.neighbours.filter((id) => p.cellIds.includes(id) && id !== p.capitalCell && world.cellById.get(id).tension >= seed.tension * 0.8)];
	}
	leaving = leaving.filter((id) => p.cellIds.includes(id) && id !== p.capitalCell);
	if (!leaving.length) return null;
	const capital = world.cellById.get(leaving[0]);
	const fresh = {
		id: `${capital.id}-${world.year}`,
		name: name ?? `Republic of ${capital.name ?? capital.id}`,
		capitalCell: capital.id,
		cellIds: [],
		government: 'republic',
		stateReligion: null,
		treasury: 0,
		army: 0.03,
		stability: 0.5,
		knowledge: p.knowledge,
		tech: [...p.tech],
		atWarWith: []
	};
	world.polities.push(fresh);
	for (const id of leaving) transferCell(world, world.cellById.get(id), fresh);
	world.events.push({ year: world.year, kind: 'secession', polityIds: [p.id, fresh.id], cellIds: leaving, title: `${fresh.name} breaks away from ${p.name}` });
	return fresh;
}

/** The larger polity absorbs the smaller. */
export function unite(world, pa, pb, name) {
	const [big, small] = pa.cellIds.length >= pb.cellIds.length ? [pa, pb] : [pb, pa];
	for (const id of [...small.cellIds]) transferCell(world, world.cellById.get(id), big);
	big.tech = [...new Set([...big.tech, ...small.tech])];
	big.knowledge = Math.max(big.knowledge, small.knowledge);
	if (name) big.name = name;
	world.events.push({ year: world.year, kind: 'union', polityIds: [big.id, small.id], title: `${small.name} joins ${big.name}` });
}
