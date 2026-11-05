// Every tunable constant of The Timeline engine, in one place (tuned in Task 10).
// No constant here may be keyed by an ethnic group, a faith, or a named region.
export const PARAMS = {
	// economy
	baseIncome: 650, // $ per head with no schooling, infrastructure or tech
	incomeAdjust: 0.08, // share of the gap to potential income closed each year
	schoolReturn: 1.4, // income boost per unit of school literacy
	anyLitReturn: 0.3,
	infraReturn: 2,
	oilIncome: 900, // $ per head added in oil cells at oil price multiplier 1
	urbanFloor: 0.03,
	urbanScale: 5, // urban target = (ln income − ln urbanBaseIncome) / urbanScale
	urbanBaseIncome: 450,
	urbanAdjust: 0.04,
	infraGrowth: 0.004, // per year, scaled by income
	// demography
	birthBase: 0.05,
	birthLitDrop: 0.016,
	birthUrbanDrop: 0.012,
	deathBase: 0.036,
	deathIncomeDrop: 0.35, // share of deaths removed as income approaches incomeForLowDeath
	incomeForLowDeath: 12000,
	warDeath: 0.05, // extra death rate at full war damage
	lifeExpBase: 15,
	lifeExpSlope: 1200,
	// literacy
	learnRate: 0.03, // per year at full school coverage
	litDecay: 0.002
};
