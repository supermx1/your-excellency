// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/**
 * Our world's richest country that year (the UK, then the US from about 1900), per person, in the
 * Maddison Project's 2011 dollars. Past the last data year it grows at P.frontierGrowth a year.
 */
export function frontierIncome(national, year) {
	const series = national?.frontierGdpPc;
	if (!series) return null;
	const first = series.findIndex((v) => v != null);
	const last = series.findLastIndex((v) => v != null);
	const i = Math.max(first, national.years.indexOf(Math.round(year)));
	if (i <= last && series[i] != null) return series[i];
	return series[last] * (1 + P.frontierGrowth) ** (Math.round(year) - national.years[last]);
}

/** The combined productivity of a set of technologies (each one's `productivity` effect, multiplied). */
export const techProductivity = (techs, ids) => {
	const byId = new Map(techs.map((t) => [t.id, t]));
	return ids.reduce((a, id) => a * (byId.get(id)?.effects?.productivity ?? 1), 1);
};

/** The same for everything our world had by that year. */
export const worldProductivity = (techs, year) =>
	techProductivity(
		techs,
		techs.filter((t) => t.worldYear != null && t.worldYear <= year).map((t) => t.id)
	);

/** Everyone at school, full roads and power all day: the most those three multiply income by. */
export const FULL_SKILLS = (1 + P.litReturn) * (1 + P.infraReturn) * (1 + P.powerIncomeReturn);

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
		p.powerDemand = demand;
		out.set(p.id, demand > 0 ? clamp(p.powerSupply / demand, 0, 1) : P.powerReliability);
	}
	return out;
}

/**
 * Where a government's sea trade goes out: each of its places sends its trade through the nearest
 * harbour it holds. Returns harbour id → people whose trade passes through it.
 */
export function harbourTrade(world, polity) {
	const harbours = polity.cellIds.map((id) => world.cellById.get(id)).filter((c) => c?.harbour);
	const out = new Map(harbours.map((h) => [h.id, 0]));
	if (!harbours.length) return out;
	const d2 = (a, b) => (a.centroid[0] - b.centroid[0]) ** 2 + (a.centroid[1] - b.centroid[1]) ** 2;
	for (const id of polity.cellIds) {
		const c = world.cellById.get(id);
		if (!c) continue;
		const port = harbours.reduce((a, b) => (d2(c, b) < d2(c, a) ? b : a));
		out.set(port.id, out.get(port.id) + c.pop);
	}
	return out;
}

/**
 * Minerals sold abroad, $ a year by place. Each deposit (data/minerals.json) gives its full output while
 * our world's price is at least what it was in its reference year; lower prices close mines in proportion.
 * The output is shared among the deposit's places; each sells the share it can get out: a steady
 * government, markets that reach it (bulk ore also needs a railway to a port), and a currency that oil
 * has not made dear. Same rule for every government. ponytail: no new mines above full output.
 */
function mineralsSold(world, polityById) {
	const national = world.data.national;
	const at = (series, year) => series?.[national.years.indexOf(year)] ?? null;
	const out = new Map();
	for (const d of world.data.minerals?.deposits ?? []) {
		if (world.year < (d.from ?? -Infinity)) continue;
		const series = national?.mineralPrices?.[d.price];
		const price = d.pricePerTonne ?? at(series, world.year);
		if (!price) continue;
		const output = d.tonnes * (d.refYear ? Math.min(1, price / at(series, d.refYear)) : 1);
		for (const id of d.cells) {
			const c = world.cellById.get(id);
			const p = polityById.get(c?.polityId);
			if (!c || !p || (d.bulk && !p.tech.includes('railway'))) continue;
			const dutch = Math.exp(-P.dutchDisease * (p.oilShare ?? 0));
			const share = clamp(P.mineScale * p.stability * c.marketAccess * dutch, 0, 1);
			out.set(id, (out.get(id) ?? 0) + (output * price * share) / d.cells.length);
		}
	}
	return out;
}

/** Income, urbanisation and infrastructure per cell. Same rules for every cell. */
/** @param {import('../types.js').World} world */
export function stepEconomy(world) {
	const oilCells = new Set(world.data.events?.groups?.oil ?? []);
	const oilOn = world.flags.oilFound && world.switches.oilInGround !== false;
	// Wells, pipes and terminals take years: output reaches full P.oilRampYears after the first find.
	if (oilOn) world.flags.oilFoundYear ??= world.year;
	const oilRamp = oilOn
		? clamp((world.year - world.flags.oilFoundYear) / P.oilRampYears, 0, 1) ** 3
		: 0;
	const trade = { oil: 0, farm: 0, goods: 0, minerals: 0, power: 0, powerTwh: 0, twh: 0 };
	const sums = new Map(world.polities.map((p) => [p, { oil: 0, income: 0, pop: 0 }]));
	const power =
		world.switches.power24hFromYear != null && world.year >= world.switches.power24hFromYear;
	const polityById = new Map(world.polities.map((p) => [p.id, p]));
	const freeSchool =
		world.switches.freeSchoolingFromYear != null &&
		world.year >= world.switches.freeSchoolingFromYear;
	// Light public budget: a government that is oil-rich feels the squeeze half as much.
	const oilRich = new Set(oilOn ? [...oilCells].map((id) => world.cellById.get(id)?.polityId) : []);
	const resourcesOf = (c) =>
		(polityById.get(c.polityId)?.stability ?? 0.5) * Math.min(1, c.incomePc / 2000);
	// While free schooling is still being built, it takes money that would otherwise go to the grid.
	const squeezeOf = (c) =>
		freeSchool && c.schoolExpansion < P.schoolPolicyCoverage - 0.01
			? P.schoolBudgetShare * (oilRich.has(c.polityId) ? 0.5 : 1)
			: 0;
	const reliability = gridReliability(world, squeezeOf);
	const through = new Map(world.polities.flatMap((p) => [...harbourTrade(world, p)]));
	// What a modern economy here would earn: our world's richest country this year, raised or lowered
	// by how far ahead of or behind our world this government's technology is. Same for every government.
	const techs = world.data.tech ?? [];
	const frontier = frontierIncome(world.data.national, world.year);
	const ourTech = worldProductivity(techs, world.year);
	const techOf = new Map(world.polities.map((p) => [p.id, techProductivity(techs, p.tech)]));
	const meanDensity =
		world.cells.reduce((s, c) => s + c.pop, 0) / (world.cells.reduce((s, c) => s + c.area, 0) || 1);
	const mined = mineralsSold(world, polityById);
	for (const c of world.cells) {
		const polity = polityById.get(c.polityId);
		const resources = resourcesOf(c);
		const squeeze = squeezeOf(c);
		if (power)
			c.electricityAccess = 1; // This scenario explicitly supplies universal, uninterrupted power.
		else if (polity?.tech.includes('electricity')) {
			// Crowded places are cheaper to wire per home, so the grid reaches them first;
			// the rest of the land as roads reach it.
			const dense = clamp(
				P.gridDenseBase + P.gridDenseSlope * Math.log10(c.pop / (c.area || 1) / meanDensity),
				0,
				1
			);
			const target = clamp(dense + (1 - dense) * c.infra * P.ruralGridReach, 0, 1);
			c.electricityAccess +=
				((Math.max(0, target - c.electricityAccess) *
					P.connectionGrowth *
					(polity.stability * c.incomePc)) /
					P.gridIncomeUnit) * // wiring costs money: poor places wire slowly
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
			// A harbour earns from the trade of everyone behind it: more people, more trade, more income.
			trade: c.harbour
				? 1 + P.portPremium * ((n) => n / (n + P.portScale))(through.get(c.id) ?? 0)
				: 1,
			// Big cities are more productive: more trades, firms and buyers close together.
			city: 1 + P.cityReturn * Math.max(0, Math.log10((c.urban * c.pop) / 1e6)),
			// The seat of government draws public salaries and contracts, whoever governs.
			capital: polity?.capitalCell === c.id ? 1 + P.capitalPremium : 1,
			infrastructure: 1 + P.infraReturn * c.infra,
			electricity: 1 + P.powerIncomeReturn * c.powerService,
			conflict: 1 - 0.5 * c.warDamage,
			food: 1 - P.foodIncomeLoss * c.foodStress,
			// Coups, war and graft make it hard to plan, trade or invest; so does soldiers' rule in place
			// of an elected government. A palace coup in a kingdom swaps one ruler for another: no loss.
			government:
				(1 - P.governanceLoss * (1 - (polity?.stability ?? 0.5))) *
				(polity?.government === 'military' &&
				['republic', 'federation'].includes(polity.governmentBeforeCoup)
					? 1 - P.militaryIncomeLoss
					: 1),
			// A government that rules from abroad sends part of what is made home: company profits, taxes.
			colonial: polity?.british ? 1 - P.colonialDrain : 1
		};
		const { literacy, infrastructure, electricity, ...rest } = c.incomeFactors;
		// The farming and trading economy: what this place's tools, skills and setting earn.
		const traditional =
			P.baseIncome *
			c.mods.productivity *
			Object.values(c.incomeFactors).reduce((a, b) => a * b, 1);
		// Two economies: farming and trade, and a modern one earning at the world's level for its
		// technology. The modern share needs nearly everyone schooled, connected and powered: it is the
		// share of full skills raised to P.modernExponent (at 80% about a fifth, at 95% about 70%).
		const tech = techOf.get(c.polityId) ?? 1;
		const modern =
			frontier == null
				? 0
				: frontier *
					(tech / ourTech) ** P.frontierElasticity *
					(c.mods.productivity / tech) * // world events: droughts, slumps, pandemics
					Object.values(rest).reduce((a, b) => a * b, 1);
		const share = ((literacy * infrastructure * electricity) / FULL_SKILLS) ** P.modernExponent;
		c.incomeFactors.modern =
			traditional > 0 ? 1 + (share * Math.max(0, modern - traditional)) / traditional : 1;
		const oilRent = oilOn && oilCells.has(c.id) ? P.oilIncome * (world.oilPrice ?? 1) * oilRamp : 0;
		const mine = mined.get(c.id) ?? 0; // $ a year; its owners and miners earn it here
		const potential = traditional * c.incomeFactors.modern + oilRent + mine / (c.pop || 1);
		c.incomePc = clamp(c.incomePc + (potential - c.incomePc) * P.incomeAdjust, 100, 1e6);

		// Sold abroad, $ a year: all the oil; farm goods where markets reach the farms; a share of the
		// modern economy. Oil money makes the rest dearer abroad. Same rule for every government.
		// ponytail: all technology counts as farm technology; no minerals (add with deposit and price data).
		const dutch = Math.exp(-P.dutchDisease * (polity?.oilShare ?? 0));
		trade.oil += oilRent * c.pop;
		trade.minerals += mine;
		trade.farm +=
			P.farmExport *
			P.baseIncome *
			c.mods.productivity *
			c.marketAccess *
			(1 - c.urban) *
			c.pop *
			dutch;
		trade.goods += P.goodsExport * traditional * (c.incomeFactors.modern - 1) * c.pop * dutch;
		// Electricity made: people with power all day, times what each uses at this income.
		trade.twh += (c.pop * c.powerService * P.kwhPerDollar * c.incomePc) / 1e9;
		const sum = sums.get(polity);
		if (sum) {
			sum.oil += oilRent * c.pop;
			sum.income += c.incomePc * c.pop;
			sum.pop += c.pop;
		}

		const urbanTarget = clamp(
			(Math.log(c.incomePc) - Math.log(P.urbanBaseIncome)) / P.urbanScale,
			P.urbanFloor,
			0.95
		);
		c.urban = clamp(c.urban + (urbanTarget - c.urban) * P.urbanAdjust, 0, 1);
		// Roads and markets settle where income can build and keep them: below that they grow
		// (faster with reliable power), above it they wear down. They no longer only ever grow.
		const gap = roadsFor(c.incomePc) - c.infra;
		c.infra = clamp(
			c.infra + gap * P.infraAdjust * (gap > 0 && power ? 2 : 1) - 0.01 * c.warDamage,
			0,
			1
		);
	}

	// Power stations a government built beyond its own people's needs sell to the neighbours, up to what
	// they would use with power all day. ponytail: one shared market, first come; no sales between states here.
	const national = world.data.national;
	let market =
		(P.kwhPerDollar * (national?.neighbourIncome?.[national.years.indexOf(world.year)] ?? 0)) / 1e9;
	for (const [p, sum] of sums) {
		p.oilShare = sum.income ? sum.oil / sum.income : 0; // next year's Dutch disease
		const spare = Math.max(0, (p.powerSupply ?? 0) - (p.powerDemand ?? 0));
		const sold = Math.min(market, (spare * P.kwhPerDollar * sum.income) / (sum.pop || 1) / 1e9);
		market -= sold;
		trade.powerTwh += sold;
	}
	trade.twh += trade.powerTwh;
	trade.power = trade.powerTwh * 1e9 * P.powerPrice;
	world.trade = trade;
}
