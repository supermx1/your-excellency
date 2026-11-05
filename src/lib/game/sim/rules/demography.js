// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** Births, deaths, life expectancy and literacy per cell. Same rules for every cell. */
/** @param {import('../types.js').World} world */
export function stepDemography(world) {
	const freeSchool =
		world.switches.freeSchoolingFromYear != null && world.year >= world.switches.freeSchoolingFromYear;
	for (const c of world.cells) {
		const birth = clamp(P.birthBase - P.birthLitDrop * c.litAny - P.birthUrbanDrop * c.urban, 0.008, 0.06);
		const wealth = Math.min(1, c.incomePc / P.incomeForLowDeath);
		const death = clamp(
			P.deathBase * c.mods.mortality * (1 - P.deathIncomeDrop * wealth) * (1 - 0.25 * c.litAny) +
				P.warDeath * c.warDamage,
			0.004,
			0.9
		);
		c.birthRate = birth;
		c.deathRate = death;
		c.pop = clamp(c.pop * (1 + birth - death), 0, 1e10);
		c.lifeExp = clamp(P.lifeExpBase + (0.045 - death) * P.lifeExpSlope, 15, 95);

		const learn = P.learnRate * c.mods.learning;
		const anySchools = clamp(c.schools.quranic + c.schools.western + (freeSchool ? 0.4 : 0), 0, 1);
		const western = clamp(c.schools.western + (freeSchool ? 0.4 : 0), 0, 1);
		c.litAny = clamp(c.litAny + learn * anySchools * (1 - c.litAny) - P.litDecay * c.litAny, 0, 1);
		c.litSchool = clamp(c.litSchool + learn * western * (1 - c.litSchool) - P.litDecay * c.litSchool, 0, c.litAny);
	}
}
