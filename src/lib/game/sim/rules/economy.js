// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** Income, urbanisation and infrastructure per cell. Same rules for every cell. */
/** @param {import('../types.js').World} world */
export function stepEconomy(world) {
	const oilCells = new Set(world.data.events?.groups?.oil ?? []);
	const oilOn = world.flags.oilFound && world.switches.oilInGround !== false;
	const power =
		world.switches.power24hFromYear != null && world.year >= world.switches.power24hFromYear;
	const polityById = new Map(world.polities.map((p) => [p.id, p]));
	const freeSchool =
		world.switches.freeSchoolingFromYear != null && world.year >= world.switches.freeSchoolingFromYear;
	// Light public budget: a government that is oil-rich feels the squeeze half as much.
	const oilRich = new Set(oilOn ? [...oilCells].map((id) => world.cellById.get(id)?.polityId) : []);
	for (const c of world.cells) {
		const polity = polityById.get(c.polityId);
		const resources = (polity?.stability ?? 0.5) * Math.min(1, c.incomePc / 2000);
		// While free schooling is still being built, it takes money that would otherwise extend the grid.
		const squeeze =
			freeSchool && c.schoolExpansion < P.schoolPolicyCoverage - 0.01
				? P.schoolBudgetShare * (oilRich.has(c.polityId) ? 0.5 : 1)
				: 0;
		if (power)
			c.electricityAccess = 1; // This scenario explicitly supplies universal, uninterrupted power.
		else if (polity?.tech.includes('electricity')) {
			const target = clamp(c.infra * (0.5 + 0.5 * Math.min(1, c.incomePc / 4000)), 0, 1);
			c.electricityAccess +=
				Math.max(0, target - c.electricityAccess) * P.connectionGrowth * resources * (1 - squeeze);
		}
		// Connected access and usable service are different. War disrupts service, not recorded connections.
		c.powerService = c.electricityAccess * (power ? 1 : P.powerReliability) * (1 - c.warDamage);
		if (freeSchool) {
			const teachers = 0.2 + 0.8 * c.litAny;
			c.schoolExpansion +=
				(P.schoolPolicyCoverage - c.schoolExpansion) * P.schoolExpansionRate * resources * teachers;
		}
		c.schoolExpansion = clamp(
			c.schoolExpansion * (1 - 0.05 * c.warDamage),
			0,
			P.schoolPolicyCoverage
		);
		if (polity?.tech.includes('printing')) {
			const funding = polity.stability * Math.min(1, c.incomePc / 2000);
			c.schools.state = clamp(
				c.schools.state + P.stateSchoolGrowth * funding * (1 - c.schools.state),
				0,
				1
			);
		}
		c.incomeFactors = {
			literacy: 1 + P.litReturn * c.litAny, // any script: no faith's schools count for more
			infrastructure: 1 + P.infraReturn * c.infra,
			electricity: 1 + P.powerIncomeReturn * c.powerService,
			conflict: 1 - 0.5 * c.warDamage,
			food: 1 - P.foodIncomeLoss * c.foodStress
		};
		const potential =
			P.baseIncome *
				c.mods.productivity *
				Object.values(c.incomeFactors).reduce((a, b) => a * b, 1) +
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
