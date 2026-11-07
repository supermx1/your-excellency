// Every tunable constant of The Timeline engine, in one place (tuned in Task 10).
// No constant here may be keyed by an ethnic group, a faith, or a named region.
export const PARAMS = {
	// economy
	baseIncome: 650, // $ per head with no schooling, infrastructure or tech
	incomeAdjust: 0.08, // share of the gap to potential income closed each year
	litReturn: 2, // income boost per unit of school literacy
	otherScriptReturn: 0.3, // share of that boost from reading in another script (owner's decision)
	infraReturn: 2,
	oilIncome: 900, // $ per head added in oil cells at oil price multiplier 1
	urbanFloor: 0.03,
	urbanScale: 2.6, // urban target = (ln income − ln urbanBaseIncome) / urbanScale
	urbanBaseIncome: 550,
	urbanAdjust: 0.04,
	infraBaseIncome: 400, // income ($ a head) below which a place keeps up no roads or markets
	infraIncomeSpan: 2, // full roads at 10^span times that income
	infraAdjust: 0.03, // share of the gap to the affordable level closed each year
	// Gameplay assumptions, not fitted causal estimates from DHS (see docs/timeline-data.md).
	powerReliability: 0.5, // starting share of the day a grid supplies, before it builds or wears
	powerBuild: 0.02, // people a year a grid can power all day, per person × stability × income/gridIncomeUnit
	powerWear: 0.04, // share of power-station capacity lost each year without replacement (about 25-year life)
	ruralGridReach: 0.6, // share of the rest of the land the grid can reach at full roads
	gridDenseBase: 0.4, // share wired first in a place as crowded as the national average
	gridDenseSlope: 0.7, // more for each tenfold more crowded (cheaper per home), less for sparser
	powerIncomeReturn: 0.15, // full effective service adds at most 15% to non-oil potential income
	connectionGrowth: 0.07, // annual share of the affordable connection gap closed, at gridIncomeUnit and full stability
	gridIncomeUnit: 4000, // $ a head at which grid building and wiring run at their base rates (no cap above)
	schoolExpansionRate: 0.12, // free-school capacity expands gradually, scaled by resources and skills
	schoolPolicyCoverage: 0.4,
	// Livelihood rules are sensitivity assumptions, not household-survey estimates.
	warFoodPressure: 0.35,
	foodRecovery: 0.06,
	foodDepletion: 0.1,
	foodIncomeLoss: 0.1,
	portPremium: 0.6, // most extra income a harbour can earn from the trade passing through it (assumption)
	portScale: 20e6, // people behind a harbour at which it earns half that
	cityReturn: 0.15, // extra income per tenfold more town-dwellers above a million (assumption)
	capitalPremium: 0.5, // extra income in a government's seat: public salaries and contracts (assumption)
	governanceLoss: 0.4, // share of income lost under a completely unsteady government (assumption)
	colonialDrain: 0.3, // share of what a colony makes that goes abroad (assumption)
	schoolBudgetShare: 0.35, // share of grid-building money free schooling takes while it expands (assumption)
	riverTrade: 0.08, // market access for states on the Niger or Benue (assumption; coast adds 0.1)
	migrationThreshold: 0.15,
	opportunityMigration: 0.0015,
	pressureMigration: 0.01,
	maxMigration: 0.02,
	// demography
	birthBase: 0.05,
	birthLitDrop: 0.007,
	birthUrbanDrop: 0.008,
	transitionUrbanWeight: 0.5, // births fall with literacy (any script) and town life equally
	transitionStart: 0.75, // that blend, where birth rates start falling fast (assumption, see docs/timeline-data.md)
	transitionDrop: 0.03, // births per person per year removed at full transition (fitted to 2025, 2050 and the UN 2100 projection)
	deathBase: 0.045,
	deathIncomeDrop: 0.35, // share of deaths removed as income approaches incomeForLowDeath
	incomeForLowDeath: 12000,
	warDeath: 0.05, // extra death rate at full war damage
	lifeExpBase: 25,
	lifeExpSlope: 950,
	// religion (one set of weights for every faith)
	relRate: 0.03, // share of the gap to the pulled mix closed each year
	relNeighbour: 0.15,
	relState: 0.08,
	relSchool: 5,
	schoolGrowth: 0.004,
	communitySchools: 0.02, // yearly school growth per share of parents who read, in their script (assumption)
	schoolWalk: 0.5, // more school growth for each tenfold more crowded than average: more children within walking distance
	missionSpread: 1 / 15, // years for missionaries to move on: 15 from one neighbour, less from several
	missionPresence: 0.8, // where missionaries work, their schools grow as if this share already believed
	stateSchoolGrowth: 0.003, // government schools, from income and stability
	// polities and conflict (same for every polity)
	warBase: 0.002,
	warTension: 0.03,
	warWeakness: 0.01,
	coupBase: 0.02,
	// Post-independence crises: our coup years are moments of high risk, counted from independence.
	// A coup happens only if the state is shaky then; civil war needs a recent coup and a shaken state.
	coupWindowStability: 0.64,
	civilWarStability: 0.55,
	secessionBase: 0.03,
	unionBase: 0.004,
	// technology
	knowledgeRate: 0.0066, // per year, × learning², × (0.3 + 2 × literacy)
	knowledgePerTech: 0.05,
	adoptBase: 0.004,
	adoptLit: 0.08,
	adoptTrade: 0.03,
	adoptColonial: 0.05,
	inventMargin: 1, // knowledge must exceed a tech's threshold by this much to invent it
	inventChance: 0.2,
	// literacy
	learnRate: 0.018, // per year at full school coverage
	litDecay: 0.002
};
