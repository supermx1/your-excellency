// @ts-nocheck
// Real events. 'world' events always fire (nature and the outside world stay real);
// 'history' events fire only when their switch allows it and every required flag holds.
// Post-independence coups and the civil war follow causes, not the calendar: their dates count
// from independence, and they happen only if the state is unstable at that moment.
import { PARAMS as P } from '../params.js';
import { coup, secede } from './polities.js';
import { startWar, transferCell, verb } from './conflict.js';
import { harbourTrade } from './economy.js';

/** Is a history event allowed by its switch? Returns the year it should fire in, or null. */
function scheduledYear(event, sw, flags = {}) {
	if (event.id === 'oil-oloibiri') {
		if (sw.oilInGround === false || sw.oilDiscovery === false) return null;
		return sw.oilYear ?? event.year;
	}
	if (event.switch === 'independenceYear') return sw.independenceYear ?? event.year;
	const late = (flags.independentYear ?? 1960) - 1960; // a later independence moves its crises with it
	if (event.switch === 'coups') return (sw.coups ?? 'history') === 'off' ? null : event.year + late;
	if (event.switch === 'civilWar') return sw.civilWar === false ? null : event.year + late;
	if (event.switch && sw[event.switch] === false) return null;
	return event.year;
}

const cellsFor = (world, spec) => {
	const groups = world.data.events?.groups ?? {};
	const all = world.cells.map((c) => c.id);
	if (spec === 'all') return all;
	if (spec === 'south') return all.filter((id) => !(groups.north ?? []).includes(id));
	if (typeof spec === 'string') return groups[spec] ?? [];
	return spec;
};

/** Britain's technology comes from Britain: our world's, whatever happens here. */
const britainKnowledge = (year) =>
	P.britainKnowledge1861 + P.britainKnowledgeGrowth * (year - 1861);

/** A beaten (or not yet possible) conquest comes back later, while the scramble lasts. */
function tryAgain(world, event) {
	const year = world.year + P.conquestRetry;
	if (year <= P.conquestUntil) (world.retry ??= {})[event.id] = year;
}

function britishPolity(world) {
	let p = world.polities.find((x) => x.british);
	if (!p) {
		p = {
			id: 'british',
			name: 'British territories',
			capitalCell: null,
			cellIds: [],
			government: 'colony',
			stateReligion: null,
			treasury: 0,
			army: 0.04,
			stability: 0.6,
			knowledge: britainKnowledge(world.year),
			// What reaches the people it governs is what their land already had, then what it imports with its
			// colonial head start (adoptColonial), not everything Europe knew on the day it arrived.
			tech: [],
			atWarWith: [],
			british: true
		};
		world.polities.push(p);
	}
	return p;
}

/**
 * A power that arrives by sea governs from a harbour. It chooses one when it first holds a harbour,
 * and again when it merges its administrations (`reconsider`). The choice is a chance weighted by the
 * trade behind each harbour; the sitting seat counts double, since moving a government is costly.
 */
function seatBySea(world, p, reconsider = false) {
	const trade = harbourTrade(world, p);
	if (!trade.size) return;
	if (world.cellById.get(p.capitalCell)?.harbour && !reconsider) return;
	const weights = [...trade].map(([id, people]) => [id, people * (id === p.capitalCell ? 2 : 1)]);
	let r = world.rand() * weights.reduce((s, [, w]) => s + w, 0);
	for (const [id, w] of weights) if ((r -= w) <= 0) return void (p.capitalCell = id);
}

function apply(world, event) {
	const fx = event.effects ?? {};
	for (const [flag, value] of Object.entries(fx.flags ?? {})) world.flags[flag] = value;
	for (const id of fx.missions ?? []) world.missionCells.add(id);

	if (fx.conquer) {
		const brit = britishPolity(world);
		const owners = new Map();
		for (const id of fx.conquer.cellIds) {
			const cell = world.cellById.get(id);
			const from = world.polities.find((p) => p.id === cell.polityId) ?? null;
			if (from === brit) continue;
			owners.set(from, [...(owners.get(from) ?? []), cell]);
		}
		// Each state defends its own land, and wins unless Britain is far enough ahead in technology.
		// Same rule for every state; ponytail: technology only, not numbers, terrain or unity.
		const beaten = [];
		const taken = [];
		for (const [from, cells] of owners) {
			const chance = (britainKnowledge(world.year) - (from?.knowledge ?? 0)) / P.conquestEdge;
			if (from && chance < 1 && world.rand() >= chance) {
				beaten.push(from);
				continue;
			}
			if (from) {
				brit.tech = [...new Set([...brit.tech, ...from.tech])];
				from.atWarWith = from.atWarWith.filter((x) => x !== brit.id);
				brit.atWarWith = brit.atWarWith.filter((x) => x !== from.id);
				taken.push([from, cells]);
			}
			for (const cell of cells) {
				transferCell(world, cell, brit);
				cell.indirectRule = world.switches.indirectRule !== false;
			}
		}
		for (const from of beaten) {
			from.stability = Math.min(1, from.stability + 0.1); // a won defence rallies people behind their rulers
			world.events.push({
				year: world.year,
				kind: 'conquest',
				failed: true,
				polityIds: [from.id],
				title: `${from.name} ${verb(from.name, 'drives', 'drive')} off a British attack`
			});
		}
		if (brit.cellIds.length) {
			brit.capitalCell ??= brit.cellIds[0];
			seatBySea(world, brit);
			world.flags.britishRule = true;
		}
		world.polities = world.polities.filter((p) => p.cellIds.length);
		if (beaten.length) {
			tryAgain(world, event);
			// Only some fell: name them, not our history's headline. No sack where the attack failed.
			// The whole state, or the places taken from one that holds out elsewhere.
			for (const [from, cells] of taken)
				world.events.push({
					year: world.year,
					kind: 'conquest',
					polityIds: [from.id],
					cellIds: cells.map((c) => c.id),
					title: from.cellIds.length
						? `Britain takes ${cells
								.map((c) => c.name ?? c.id)
								.join(', ')
								.replace(/, ([^,]*)$/, ' and $1')} from ${from.name}`
						: `Britain takes ${from.name}`
				});
			return false;
		}
	}

	if (fx.merge) {
		const brit = world.polities.find((p) => p.british);
		if (brit) {
			const old = brit.id;
			for (const p of world.polities)
				p.atWarWith = p.atWarWith.map((x) => (x === old ? fx.merge.id : x));
			for (const w of world.wars ?? []) {
				if (w.a === old) w.a = fx.merge.id;
				if (w.b === old) w.b = fx.merge.id;
			}
			brit.id = fx.merge.id;
			brit.name = fx.merge.name;
			for (const c of world.cells) if (brit.cellIds.includes(c.id)) c.polityId = brit.id;
			seatBySea(world, brit, true);
		}
	}

	if (fx.capital) {
		// A government moves its seat only within its own land.
		const ng = world.polities.find((p) => p.id === 'nigeria' && p.cellIds.includes(fx.capital));
		if (ng) ng.capitalCell = fx.capital;
	}

	if (event.id === 'independence') {
		world.flags.independentYear = world.year;
		const ng = world.polities.find((p) => p.id === 'nigeria');
		if (ng) {
			ng.british = false;
			ng.government = 'federation';
			ng.name = 'Federal Republic of Nigeria';
		}
	}

	if (fx.coup) {
		const ng = world.polities.find((p) => p.id === 'nigeria');
		if (ng) coup(world, ng, { log: false });
	}

	if (fx.war) {
		const ng = world.polities.find((p) => p.id === 'nigeria');
		const side = cellsFor(world, fx.war.on).filter((id) => ng?.cellIds.includes(id));
		if (ng && side.length) {
			const rebel = secede(world, ng, side, 'Republic of Biafra');
			if (rebel) {
				const war = startWar(world, ng, rebel, 0.8, 'Civil war: Biafra fights for independence');
				war.reabsorb = true;
				war.minYears = fx.war.years;
			}
		}
	}

	const drought = event.id.startsWith('drought') ? (world.switches.drought ?? 1) : 1;
	for (const kind of ['mortality', 'productivity', 'oilPrice', 'insurgency']) {
		if (!fx[kind]) continue;
		const scaled = { ...fx[kind] };
		if (scaled.share) scaled.share *= drought;
		if (scaled.mult && kind === 'productivity') scaled.mult = 1 - (1 - scaled.mult) * drought;
		world.activeEffects.push({
			kind,
			source: event.id,
			...scaled,
			cells: cellsFor(world, fx[kind].cells ?? 'all'),
			until: world.year + (fx[kind].years ?? 1)
		});
	}
}

/** Coups need a shaky state; civil war needs a coup in the last two years and a shaken state. */
function causesHold(world, e) {
	const fx = e.effects ?? {};
	if (!fx.coup && !fx.war) return true;
	const ng = world.polities.find((p) => p.id === 'nigeria');
	if (!ng) return false;
	if (fx.coup)
		return ng.stability < P.coupWindowStability + (world.switches.coups === 'likely' ? 0.1 : 0);
	return (ng.lastCoupYear ?? -Infinity) >= world.year - 2 && ng.stability < P.civilWarStability;
}

/** @param {import('../types.js').World} world */
export function stepEvents(world) {
	const sw = world.switches;
	const all = world.data.events?.events ?? [];
	if (!world.activeEffects) {
		world.activeEffects = [];
		// Flags from events before the start year (e.g. missionaries arriving in 1842).
		for (const e of all)
			if (
				e.year < world.inputs.startYear &&
				e.effects?.flags &&
				!e.requires &&
				scheduledYear(e, sw) !== null
			)
				Object.assign(world.flags, e.effects.flags);
		for (const e of all)
			if (e.year < world.inputs.startYear && scheduledYear(e, sw) !== null) {
				for (const id of e.effects?.missions ?? []) world.missionCells.add(id);
				for (const id of e.effects?.conquer?.cellIds ?? [])
					world.cellById.get(id).indirectRule = sw.indirectRule !== false;
			}
	}

	world.fired ??= new Set();
	for (const e of all) {
		const again = world.retry?.[e.id];
		const year = again ?? (e.kind === 'world' ? e.year : scheduledYear(e, sw, world.flags));
		if (year === null || (world.fired.has(e.id) && again !== world.year)) continue;
		// Year-switch events (independence, oil) wait until their requirements hold.
		const waits = e.switch === 'independenceYear' || e.id === 'oil-oloibiri';
		if (waits ? year > world.year : year !== world.year) continue;
		if (e.kind === 'history' && !(e.requires ?? []).every((f) => world.flags[f])) {
			if (e.effects?.conquer) tryAgain(world, e); // no foothold yet: Britain comes back later
			continue;
		}
		// Skipping only the first step lets completed historical events replay the next year.
		// Explicitly postponed events have a future scheduled year and remain eligible.
		if (waits && year < world.inputs.startYear && e.year < world.inputs.startYear) {
			world.fired.add(e.id);
			continue;
		}
		world.fired.add(e.id);
		if (!causesHold(world, e)) continue; // the moment passes; a stable country rides it out
		if (apply(world, e) === false) continue;
		// A crisis moved by a later independence keeps its name but not our month.
		const title = world.year === e.year ? e.title : e.title.replace(/ \([A-Z][a-z]+ \d{4}\)$/, '');
		world.events.push({ year: world.year, kind: e.kind, id: e.id, title });
	}

	world.activeEffects = world.activeEffects.filter((fx) => fx.until > world.year);
	for (const fx of world.activeEffects) {
		const cells = fx.cells.map((id) => world.cellById.get(id)).filter(Boolean);
		if (fx.kind === 'mortality') for (const c of cells) c.pop *= 1 - fx.share;
		if (fx.kind === 'productivity') for (const c of cells) c.mods.productivity *= fx.mult;
		if (fx.kind === 'oilPrice') world.oilPrice = fx.mult;
		if (fx.kind === 'insurgency')
			for (const c of cells) {
				c.warDamage = Math.max(c.warDamage, 0.3);
				c.pop *= 1 - fx.deathShare / (fx.years ?? 1);
			}
	}
}
