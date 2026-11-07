// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** How much road and market a place's income can build and maintain (0–1). */
export const roadsFor = (incomePc) =>
	clamp(Math.log10(incomePc / P.infraBaseIncome) / P.infraIncomeSpan, 0, 1);

/**
 * Each government's grid: investment (stability times income, less what free schooling takes) builds
 * power stations, and stations wear out. The share of the day they cover everyone connected is the
 * grid's reliability, so connecting people faster than building supply means fewer hours for all.
 * Supply is counted in people it could power all day. Same rule for every government.
 * @returns {Map<string, number>} reliability (0–1) by polity id
 */
function gridReliability(world, squeezeOf) {
	const out = new Map();
	for (const p of world.polities) {
		let demand = 0;
		let invest = 0;
		for (const id of p.cellIds) {
			const c = world.cellById.get(id);
			demand += c.pop * c.electricityAccess;
			// Richer, steadier governments build more: no cap on what income can pay for.
			invest += c.pop * p.stability * (c.incomePc / P.gridIncomeUnit) * (1 - squeezeOf(c));
		}
		// A new grid (or a government new to the map) starts at the assumed starting reliability.
		p.powerSupply ??= demand * P.powerReliability;
		if (p.tech.includes('electricity'))
			p.powerSupply += P.powerBuild * invest - P.powerWear * p.powerSupply;
		out.set(p.id, demand > 0 ? clamp(p.powerSupply / demand, 0, 1) : P.powerReliability);
	}
	return out;
}

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
	const resourcesOf = (c) => (polityById.get(c.polityId)?.stability ?? 0.5) * Math.min(1, c.incomePc / 2000);
	// While free schooling is still being built, it takes money that would otherwise go to the grid.
	const squeezeOf = (c) =>
		freeSchool && c.schoolExpansion < P.schoolPolicyCoverage - 0.01
			? P.schoolBudgetShare * (oilRich.has(c.polityId) ? 0.5 : 1)
			: 0;
	const reliability = gridReliability(world, squeezeOf);
	const meanDensity =
		world.cells.reduce((s, c) => s + c.pop, 0) / (world.cells.reduce((s, c) => s + c.area, 0) || 1);
	for (const c of world.cells) {
		const polity = polityById.get(c.polityId);
		const resources = resourcesOf(c);
		const squeeze = squeezeOf(c);
		if (power)
			c.electricityAccess = 1; // This scenario explicitly supplies universal, uninterrupted power.
		else if (polity?.tech.includes('electricity')) {
			// Crowded places are cheaper to wire per home, so the grid reaches them first;
			// the rest of the land as roads reach it.
			const dense = clamp(P.gridDenseBase + P.gridDenseSlope * Math.log10(c.pop / (c.area || 1) / meanDensity), 0, 1);
			const target = clamp(dense + (1 - dense) * c.infra * P.ruralGridReach, 0, 1);
			c.electricityAccess +=
				Math.max(0, target - c.electricityAccess) *
				P.connectionGrowth *
				(polity.stability * c.incomePc) / P.gridIncomeUnit * // wiring costs money: poor places wire slowly
				(1 - squeeze);
		}
		// Connected access and usable service are different: service is the share of the day the
		// grid can supply everyone connected. War disrupts service, not recorded connections.
		const hours = power ? 1 : (reliability.get(c.polityId) ?? P.powerReliability);
		c.powerService = c.electricityAccess * hours * (1 - c.warDamage);
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
			// The outside world stays real in every run, and its trade, books and machines run in Roman-script
			// languages: school reading pays fully, other reading (Quranic, Ajami) partly. Script, not faith:
			// a school of any faith teaching the school curriculum counts fully. Owner's decision, 2026-11-07.
			literacy: 1 + P.litReturn * (c.litSchool + P.otherScriptReturn * (c.litAny - c.litSchool)),
			// The seat of government draws public salaries and contracts, whoever governs.
			capital: polity?.capitalCell === c.id ? 1 + P.capitalPremium : 1,
			infrastructure: 1 + P.infraReturn * c.infra,
			electricity: 1 + P.powerIncomeReturn * c.powerService,
			conflict: 1 - 0.5 * c.warDamage,
			food: 1 - P.foodIncomeLoss * c.foodStress,
			// Coups, war and graft make it hard to plan, trade or invest.
			government: 1 - P.governanceLoss * (1 - (polity?.stability ?? 0.5)),
			// A government that rules from abroad sends part of what is made home: company profits, taxes.
			colonial: polity?.british ? 1 - P.colonialDrain : 1
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
		// Roads and markets settle where income can build and keep them: below that they grow
		// (faster with reliable power), above it they wear down. They no longer only ever grow.
		const gap = roadsFor(c.incomePc) - c.infra;
		c.infra = clamp(c.infra + gap * P.infraAdjust * (gap > 0 && power ? 2 : 1) - 0.01 * c.warDamage, 0, 1);
	}
}
