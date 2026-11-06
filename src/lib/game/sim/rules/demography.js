// @ts-nocheck
import { PARAMS as P } from '../params.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** Births, deaths, life expectancy and literacy per cell. Same rules for every cell. */
/** @param {import('../types.js').World} world */
export function stepDemography(world) {
	const meanDensity =
		world.cells.reduce((s, c) => s + c.pop, 0) / (world.cells.reduce((s, c) => s + (c.area ?? 1), 0) || 1);
	for (const c of world.cells) {
		// Fertility transition: as schooling and town life spread, families have far fewer children.
		const modern = (1 - P.transitionUrbanWeight) * c.litAny + P.transitionUrbanWeight * c.urban;
		const transition = clamp((modern - P.transitionStart) / (1 - P.transitionStart), 0, 1);
		const birth = clamp(
			P.birthBase - P.birthLitDrop * c.litAny - P.birthUrbanDrop * c.urban - P.transitionDrop * transition,
			0.008,
			0.06
		);
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
		c.lifeExp = clamp(P.lifeExpBase + (0.045 - death) * P.lifeExpSlope, 20, 95);

		const learn = P.learnRate * c.mods.learning;
		const extra = c.schoolExpansion;
		// A child attends one kind of school: when places add up to more than all the children,
		// each kind gets its proportional share. Same for every kind of school.
		const places = c.schools.quranic + c.schools.mission + c.schools.state + extra;
		const anySchools = clamp(places, 0, 1);
		const latin = clamp((c.schools.mission + c.schools.state + extra) / Math.max(1, places), 0, 1);
		c.litAny = clamp(c.litAny + learn * anySchools * (1 - c.litAny) - P.litDecay * c.litAny, 0, 1);
		c.litSchool = clamp(
			c.litSchool + learn * latin * (1 - c.litSchool) - P.litDecay * c.litSchool,
			0,
			c.litAny
		);
		// Parents who read want their children to read, and some of them can teach: communities open more
		// schools like the ones they have, until every child has a place, faster where more children
		// live within walking distance. Same rule for every kind of school.
		const walk = clamp(1 + P.schoolWalk * Math.log10(c.pop / (c.area ?? 1) / (meanDensity || 1)), 0.5, 2);
		const have = c.schools.quranic + c.schools.mission + c.schools.state;
		if (have > 0 && have < 1) {
			const grow = P.communitySchools * walk * c.litAny * (1 - have);
			for (const k of ['quranic', 'mission', 'state']) c.schools[k] += (grow * c.schools[k]) / have;
		}
	}
}
