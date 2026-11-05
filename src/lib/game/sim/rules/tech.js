// @ts-nocheck
// Technology: polities import what the outside world already has (with a lag that shrinks
// with literacy, trade and cities), or invent it themselves once their knowledge is high enough.
import { PARAMS as P } from '../params.js';

const avg = (xs, f) => (xs.length ? xs.reduce((s, x) => s + f(x), 0) / xs.length : 0);

/** @param {import('../types.js').World} world */
export function stepTech(world) {
	const learning = world.switches.learning ?? 1;
	const techs = world.data.tech ?? [];
	const byId = new Map(techs.map((t) => [t.id, t]));

	for (const p of world.polities) {
		const cells = p.cellIds.map((id) => world.cellById.get(id));
		const lit = avg(cells, (c) => c.litAny);
		const urban = avg(cells, (c) => c.urban);
		const coast = avg(cells, (c) => (c.coastal ? 1 : 0));
		p.knowledge += P.knowledgeRate * learning ** 2 * (0.3 + 2 * lit);

		for (const t of techs) {
			if (p.tech.includes(t.id) || !t.requires.every((r) => p.tech.includes(r))) continue;
			if (t.worldYear <= world.year) {
				const chance = P.adoptBase + P.adoptLit * lit + P.adoptTrade * (coast + urban) + (p.british ? P.adoptColonial : 0);
				if (world.rand() < chance) adopt(world, p, t, 'adoption');
			} else if (p.knowledge >= t.threshold + P.inventMargin && world.rand() < P.inventChance) {
				adopt(world, p, t, 'invention');
			}
		}

		for (const id of p.tech) {
			const fx = byId.get(id)?.effects ?? {};
			for (const c of cells) {
				if (fx.mortality) c.mods.mortality *= fx.mortality;
				if (fx.productivity) c.mods.productivity *= fx.productivity;
				if (fx.literacy) c.mods.learning *= fx.literacy;
			}
		}
	}
}

function adopt(world, p, t, kind) {
	p.tech.push(t.id);
	p.knowledge += P.knowledgePerTech;
	for (const id of p.cellIds) {
		const c = world.cellById.get(id);
		if (t.effects.infra) c.infra = Math.min(1, c.infra + t.effects.infra);
	}
	world.events.push({
		year: world.year,
		kind,
		techId: t.id,
		polityIds: [p.id],
		aheadOfReal: kind === 'invention' ? t.worldYear - world.year : 0,
		title: kind === 'invention' ? `${p.name} invents the ${t.name.toLowerCase()}` : `${t.name} reaches ${p.name}`
	});
}
