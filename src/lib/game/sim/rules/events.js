// @ts-nocheck
// Real events. 'world' events always fire (nature and the outside world stay real);
// 'history' events fire only when their switch allows it and every required flag holds.
import { coup, secede } from './polities.js';
import { startWar } from './conflict.js';

/** Is a history event allowed by its switch? Returns the year it should fire in, or null. */
function scheduledYear(event, sw) {
	if (event.id === 'oil-oloibiri') {
		if (sw.oilInGround === false || sw.oilDiscovery === false) return null;
		return sw.oilYear ?? event.year;
	}
	if (event.switch === 'independenceYear') return sw.independenceYear ?? event.year;
	if (event.switch === 'coups') return (sw.coups ?? 'history') === 'off' ? null : event.year;
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
			knowledge: 2.5,
			tech: world.data.tech
				.filter((t) => t.adoptable !== false && t.worldYear != null && t.worldYear <= world.year)
				.map((t) => t.id),
			atWarWith: [],
			british: true
		};
		world.polities.push(p);
	}
	return p;
}

function apply(world, event) {
	const fx = event.effects ?? {};
	for (const [flag, value] of Object.entries(fx.flags ?? {})) world.flags[flag] = value;

	if (fx.conquer) {
		const brit = britishPolity(world);
		for (const id of fx.conquer.cellIds) {
			const cell = world.cellById.get(id);
			const from = world.polities.find((p) => p.id === cell.polityId);
			if (from === brit) continue;
			if (from) {
				from.cellIds = from.cellIds.filter((x) => x !== id);
				if (from.capitalCell === id) from.capitalCell = from.cellIds[0] ?? null;
				from.atWarWith = from.atWarWith.filter((x) => x !== brit.id);
				brit.atWarWith = brit.atWarWith.filter((x) => x !== from.id);
			}
			brit.cellIds.push(id);
			cell.polityId = brit.id;
		}
		brit.capitalCell ??= fx.conquer.cellIds[0];
		world.flags.britishRule = true;
		world.polities = world.polities.filter((p) => p.cellIds.length);
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
			if (brit.cellIds.includes('fct')) brit.capitalCell = 'lagos';
		}
	}

	if (event.id === 'independence') {
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
	}

	world.fired ??= new Set();
	for (const e of all) {
		const year = e.kind === 'world' ? e.year : scheduledYear(e, sw);
		if (year === null || world.fired.has(e.id)) continue;
		// Year-switch events (independence, oil) wait until their requirements hold.
		const waits = e.switch === 'independenceYear' || e.id === 'oil-oloibiri';
		if (waits ? year > world.year : year !== world.year) continue;
		if (e.kind === 'history' && !(e.requires ?? []).every((f) => world.flags[f])) continue;
		// Skipping only the first step lets completed historical events replay the next year.
		// Explicitly postponed events have a future scheduled year and remain eligible.
		if (waits && year < world.inputs.startYear && e.year < world.inputs.startYear) {
			world.fired.add(e.id);
			continue;
		}
		world.fired.add(e.id);
		apply(world, e);
		world.events.push({ year: world.year, kind: e.kind, id: e.id, title: e.title });
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
