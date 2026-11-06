// @ts-nocheck
// Scenario rules, not fitted causal estimates. Same rates and decisions in every cell.
import { PARAMS as P } from '../params.js';
const clamp = (n) => Math.min(1, Math.max(0, n));

/** Food resilience and simultaneous, population-conserving migration between neighbours. */
export function stepLivelihoods(world) {
	const byPolity = new Map(world.polities.map((p) => [p.id, p]));
	for (const c of world.cells) {
		const tech = byPolity.get(c.polityId)?.tech ?? [];
		c.marketAccess = clamp(
			0.2 +
				0.5 * c.infra +
				0.2 * c.urban +
				(c.coastal ? 0.1 : 0) +
				(c.river ? P.riverTrade : 0) + // the Niger and Benue carried trade long before roads
				(tech.includes('railway') ? 0.15 : 0)
		);
		let harvest = 1;
		for (const fx of world.activeEffects ?? [])
			if (fx.kind === 'productivity' && fx.source?.startsWith('drought') && fx.cells.includes(c.id))
				harvest *= fx.mult;
		c.harvestShock = 1 - clamp(harvest);
		c.foodStress = clamp(c.harvestShock * (1 - c.foodBuffer) + P.warFoodPressure * c.warDamage);
		const target = clamp(0.2 + 0.6 * c.marketAccess + (tech.includes('fertiliser') ? 0.1 : 0));
		c.foodBuffer = clamp(
			c.foodBuffer + P.foodRecovery * (target - c.foodBuffer) - P.foodDepletion * c.foodStress
		);
		c.netMigration = 0;
	}
	const opportunity = (c) => Math.log(Math.max(100, c.incomePc)) * 0.2 - c.foodStress - c.warDamage;
	// Calculate every flow from the same pre-migration state. New arrivals cannot move again this year.
	const flows = [];
	const traits = ['litAny', 'litSchool', 'islam', 'christian', 'traditional'];
	const value = (c, key) => (key in c.religion ? c.religion[key] : c[key]);
	const counts = new Map(
		world.cells.map((c) => [
			c.id,
			Object.fromEntries(traits.map((key) => [key, value(c, key) * c.pop]))
		])
	);
	for (const c of world.cells) {
		const destination = c.neighbours
			.map((id) => world.cellById.get(id))
			.filter(Boolean)
			.filter((n) => opportunity(n) > opportunity(c) + P.migrationThreshold)
			.sort((a, b) => opportunity(b) - opportunity(a) || a.id.localeCompare(b.id))[0];
		if (!destination) continue;
		const rate = Math.min(
			P.maxMigration,
			P.opportunityMigration * c.marketAccess + P.pressureMigration * (c.foodStress + c.warDamage)
		);
		const people = Math.floor(c.pop * rate);
		if (people > 0) flows.push({ from: c, to: destination, people });
	}
	for (const { from, to, people } of flows) {
		from.pop -= people;
		to.pop += people;
		from.netMigration -= people;
		to.netMigration += people;
		for (const key of traits) {
			const moving = value(from, key) * people;
			counts.get(from.id)[key] -= moving;
			counts.get(to.id)[key] += moving;
		}
	}
	for (const c of world.cells) {
		if (!c.pop) continue;
		for (const key of traits) {
			const share = clamp(counts.get(c.id)[key] / c.pop);
			if (key in c.religion) c.religion[key] = share;
			else c[key] = share;
		}
	}
}
