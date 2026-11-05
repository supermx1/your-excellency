// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** Income, urbanisation and infrastructure per cell. Same rules for every cell. */
/** @param {import('../types.js').World} world */
export function stepEconomy(world) {
	const oilCells = new Set(world.data.events?.groups?.oil ?? []);
	const oilOn = world.flags.oilFound && world.switches.oilInGround !== false;
	const power = world.switches.power24hFromYear != null && world.year >= world.switches.power24hFromYear;
	for (const c of world.cells) {
		const potential =
			P.baseIncome *
			c.mods.productivity *
			(1 + P.litReturn * c.litAny) *
			(1 + P.infraReturn * c.infra) *
			(1 - 0.5 * c.warDamage) +
			(oilOn && oilCells.has(c.id) ? P.oilIncome * (world.oilPrice ?? 1) : 0);
		c.incomePc = clamp(c.incomePc + (potential - c.incomePc) * P.incomeAdjust, 100, 1e6);

		const urbanTarget = clamp(
			(Math.log(c.incomePc) - Math.log(P.urbanBaseIncome)) / P.urbanScale,
			P.urbanFloor,
			0.95
		);
		c.urban = clamp(c.urban + (urbanTarget - c.urban) * P.urbanAdjust, 0, 1);
		c.infra = clamp(
			c.infra + P.infraGrowth * Math.log10(c.incomePc / 100) * (power ? 2 : 1) - 0.01 * c.warDamage,
			0,
			1
		);
	}
}
