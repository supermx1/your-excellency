// Every tunable constant of The Timeline engine, in one place (tuned in Task 10).
// No constant here may be keyed by an ethnic group, a faith, or a named region.
export const PARAMS = {
	// economy
	baseIncome: 650, // $ per head with no schooling, infrastructure or tech
	incomeAdjust: 0.08, // share of the gap to potential income closed each year
	litReturn: 1.5, // income boost per unit of literacy in any script
	infraReturn: 2,
	oilIncome: 900, // $ per head added in oil cells at oil price multiplier 1
	urbanFloor: 0.03,
	urbanScale: 4.3, // urban target = (ln income − ln urbanBaseIncome) / urbanScale
	urbanBaseIncome: 450,
	urbanAdjust: 0.04,
	infraGrowth: 0.004, // per year, scaled by income
	// demography
	birthBase: 0.05,
	birthLitDrop: 0.01,
	birthUrbanDrop: 0.008,
	deathBase: 0.045,
	deathIncomeDrop: 0.35, // share of deaths removed as income approaches incomeForLowDeath
	incomeForLowDeath: 12000,
	warDeath: 0.05, // extra death rate at full war damage
	lifeExpBase: 25,
	lifeExpSlope: 950,
	// religion (one set of weights for every faith)
	relRate: 0.01, // share of the gap to the pulled mix closed each year
	relNeighbour: 0.15,
	relState: 0.08,
	relSchool: 0.1,
	schoolGrowth: 0.006,
	stateSchoolGrowth: 0.008, // government schools, from income and stability
	// polities and conflict (same for every polity)
	warBase: 0.002,
	warTension: 0.03,
	warWeakness: 0.01,
	coupBase: 0.02,
	secessionBase: 0.03,
	unionBase: 0.004,
	// technology
	knowledgeRate: 0.006, // per year, × learning², × (0.3 + 2 × literacy)
	knowledgePerTech: 0.05,
	adoptBase: 0.004,
	adoptLit: 0.08,
	adoptTrade: 0.03,
	adoptColonial: 0.05,
	inventMargin: 1, // knowledge must exceed a tech's threshold by this much to invent it
	inventChance: 0.2,
	// literacy
	learnRate: 0.03, // per year at full school coverage
	litDecay: 0.002
};
