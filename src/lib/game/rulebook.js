export const defaultRulebook = {
	version: 'mvp-2026-07-04',
	params: {
		campaignWeeks: 6,
		apPerTurn: 5,
		startingNaira: 2_000_000_000,
		startingPopularity: 34,
		startingConnections: 18,
		donationPerPopularity: 3_000_000,
		registrationMemberThreshold: 5000,
		registrationSpreadLgas: 4,
		turnoutInsecurityK: 0.48,
		legacyWeights: {
			nationHealth: 0.35,
			publicTrust: 0.3,
			integrity: 0.25,
			internationalStanding: 0.1
		}
	},
	provisions: [
		{
			id: 'EA-REG-001',
			document: 'Electoral Act abstraction',
			title: 'Party registration threshold',
			body: 'A party seeking recognition must show a minimum membership base and meaningful spread across local areas.',
			tags: ['party_registration'],
			params: { member_threshold: 5000, spread_lgas: 4 },
			effective_from: '2026-01-01'
		},
		{
			id: 'EA-TRIB-001',
			document: 'Electoral Act abstraction',
			title: 'Post-election petition window',
			body: 'A losing candidate may challenge an election result within a defined post-declaration window.',
			tags: ['tribunal'],
			params: { petition_window_days: 21 },
			effective_from: '2026-01-01'
		},
		{
			id: 'LEGACY-001',
			document: 'Your Excellency rulebook',
			title: 'Legacy score weights',
			body: 'Legacy rewards nation health, public trust, integrity, and international standing. Wealth is not a scoring input.',
			tags: ['legacy'],
			params: {
				nation_health: 0.35,
				public_trust: 0.3,
				integrity: 0.25,
				international_standing: 0.1
			},
			effective_from: '2026-01-01'
		}
	]
};

// State ids match @svg-maps/nigeria location ids. Registered voters are rounded
// 2023-style figures; insecurity/threat follow the PRD §5.10 regional map.
// religiousLean (muslim|christian|mixed) is a coarse game abstraction of bloc
// voting, admin-tunable — not a claim about individuals. See §9A safety framing.
// ponytail: loyalty/turnout are tuned game numbers, admin-editable later, not census data.
/** @type {{ id: string, name: string, registeredVoters: number, baseTurnout: number, loyaltyIndex: number, insecurityIndex: number, threatType: string, religiousLean: string }[]} */
const states = [
	// North-West — banditry
	{ id: 'kano', name: 'Kano', registeredVoters: 5900000, baseTurnout: 0.36, loyaltyIndex: 0.27, insecurityIndex: 58, threatType: 'banditry', religiousLean: 'muslim' },
	{ id: 'kaduna', name: 'Kaduna', registeredVoters: 4300000, baseTurnout: 0.34, loyaltyIndex: 0.29, insecurityIndex: 66, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'katsina', name: 'Katsina', registeredVoters: 3500000, baseTurnout: 0.33, loyaltyIndex: 0.26, insecurityIndex: 70, threatType: 'banditry', religiousLean: 'muslim' },
	{ id: 'zamfara', name: 'Zamfara', registeredVoters: 1900000, baseTurnout: 0.3, loyaltyIndex: 0.25, insecurityIndex: 76, threatType: 'banditry', religiousLean: 'muslim' },
	{ id: 'sokoto', name: 'Sokoto', registeredVoters: 2100000, baseTurnout: 0.32, loyaltyIndex: 0.26, insecurityIndex: 64, threatType: 'banditry', religiousLean: 'muslim' },
	{ id: 'kebbi', name: 'Kebbi', registeredVoters: 2000000, baseTurnout: 0.33, loyaltyIndex: 0.27, insecurityIndex: 55, threatType: 'banditry', religiousLean: 'muslim' },
	{ id: 'jigawa', name: 'Jigawa', registeredVoters: 2400000, baseTurnout: 0.35, loyaltyIndex: 0.28, insecurityIndex: 48, threatType: 'banditry', religiousLean: 'muslim' },
	// North-East — insurgency
	{ id: 'borno', name: 'Borno', registeredVoters: 2500000, baseTurnout: 0.28, loyaltyIndex: 0.27, insecurityIndex: 80, threatType: 'insurgency', religiousLean: 'muslim' },
	{ id: 'yobe', name: 'Yobe', registeredVoters: 1500000, baseTurnout: 0.29, loyaltyIndex: 0.27, insecurityIndex: 72, threatType: 'insurgency', religiousLean: 'muslim' },
	{ id: 'adamawa', name: 'Adamawa', registeredVoters: 2200000, baseTurnout: 0.34, loyaltyIndex: 0.3, insecurityIndex: 60, threatType: 'insurgency', religiousLean: 'mixed' },
	{ id: 'bauchi', name: 'Bauchi', registeredVoters: 2700000, baseTurnout: 0.36, loyaltyIndex: 0.27, insecurityIndex: 52, threatType: 'insurgency', religiousLean: 'muslim' },
	{ id: 'gombe', name: 'Gombe', registeredVoters: 1600000, baseTurnout: 0.35, loyaltyIndex: 0.28, insecurityIndex: 50, threatType: 'insurgency', religiousLean: 'mixed' },
	{ id: 'taraba', name: 'Taraba', registeredVoters: 2000000, baseTurnout: 0.31, loyaltyIndex: 0.29, insecurityIndex: 56, threatType: 'insurgency', religiousLean: 'mixed' },
	// North-Central / Middle Belt — farmer-herder
	{ id: 'plateau', name: 'Plateau', registeredVoters: 2800000, baseTurnout: 0.34, loyaltyIndex: 0.3, insecurityIndex: 58, threatType: 'farmer_herder', religiousLean: 'christian' },
	{ id: 'benue', name: 'Benue', registeredVoters: 2900000, baseTurnout: 0.33, loyaltyIndex: 0.31, insecurityIndex: 60, threatType: 'farmer_herder', religiousLean: 'christian' },
	{ id: 'niger', name: 'Niger', registeredVoters: 2700000, baseTurnout: 0.32, loyaltyIndex: 0.27, insecurityIndex: 62, threatType: 'farmer_herder', religiousLean: 'mixed' },
	{ id: 'kogi', name: 'Kogi', registeredVoters: 2000000, baseTurnout: 0.33, loyaltyIndex: 0.28, insecurityIndex: 46, threatType: 'farmer_herder', religiousLean: 'mixed' },
	{ id: 'kwara', name: 'Kwara', registeredVoters: 1700000, baseTurnout: 0.34, loyaltyIndex: 0.29, insecurityIndex: 40, threatType: 'farmer_herder', religiousLean: 'mixed' },
	{ id: 'nassarawa', name: 'Nasarawa', registeredVoters: 1900000, baseTurnout: 0.33, loyaltyIndex: 0.29, insecurityIndex: 50, threatType: 'farmer_herder', religiousLean: 'mixed' },
	{ id: 'fct', name: 'FCT Abuja', registeredVoters: 1600000, baseTurnout: 0.37, loyaltyIndex: 0.32, insecurityIndex: 42, threatType: 'farmer_herder', religiousLean: 'mixed' },
	// South-East — separatist
	{ id: 'anambra', name: 'Anambra', registeredVoters: 2800000, baseTurnout: 0.28, loyaltyIndex: 0.33, insecurityIndex: 52, threatType: 'separatist', religiousLean: 'christian' },
	{ id: 'imo', name: 'Imo', registeredVoters: 2400000, baseTurnout: 0.27, loyaltyIndex: 0.32, insecurityIndex: 55, threatType: 'separatist', religiousLean: 'christian' },
	{ id: 'enugu', name: 'Enugu', registeredVoters: 2100000, baseTurnout: 0.28, loyaltyIndex: 0.33, insecurityIndex: 48, threatType: 'separatist', religiousLean: 'christian' },
	{ id: 'abia', name: 'Abia', registeredVoters: 2100000, baseTurnout: 0.27, loyaltyIndex: 0.33, insecurityIndex: 46, threatType: 'separatist', religiousLean: 'christian' },
	{ id: 'ebonyi', name: 'Ebonyi', registeredVoters: 1600000, baseTurnout: 0.29, loyaltyIndex: 0.31, insecurityIndex: 44, threatType: 'separatist', religiousLean: 'christian' },
	// South-South — militancy
	{ id: 'rivers', name: 'Rivers', registeredVoters: 3500000, baseTurnout: 0.3, loyaltyIndex: 0.31, insecurityIndex: 46, threatType: 'militancy', religiousLean: 'christian' },
	{ id: 'delta', name: 'Delta', registeredVoters: 3200000, baseTurnout: 0.31, loyaltyIndex: 0.3, insecurityIndex: 44, threatType: 'militancy', religiousLean: 'christian' },
	{ id: 'akwa-ibom', name: 'Akwa Ibom', registeredVoters: 2400000, baseTurnout: 0.32, loyaltyIndex: 0.3, insecurityIndex: 38, threatType: 'militancy', religiousLean: 'christian' },
	{ id: 'edo', name: 'Edo', registeredVoters: 2500000, baseTurnout: 0.31, loyaltyIndex: 0.3, insecurityIndex: 40, threatType: 'militancy', religiousLean: 'christian' },
	{ id: 'bayelsa', name: 'Bayelsa', registeredVoters: 1100000, baseTurnout: 0.3, loyaltyIndex: 0.29, insecurityIndex: 42, threatType: 'militancy', religiousLean: 'christian' },
	{ id: 'cross-river', name: 'Cross River', registeredVoters: 1800000, baseTurnout: 0.31, loyaltyIndex: 0.3, insecurityIndex: 36, threatType: 'militancy', religiousLean: 'christian' },
	// South-West — kidnap-corridor banditry, lower intensity; religiously mixed
	{ id: 'lagos', name: 'Lagos', registeredVoters: 7000000, baseTurnout: 0.27, loyaltyIndex: 0.31, insecurityIndex: 26, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'oyo', name: 'Oyo', registeredVoters: 3300000, baseTurnout: 0.29, loyaltyIndex: 0.3, insecurityIndex: 30, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'ogun', name: 'Ogun', registeredVoters: 2700000, baseTurnout: 0.28, loyaltyIndex: 0.3, insecurityIndex: 28, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'ondo', name: 'Ondo', registeredVoters: 2000000, baseTurnout: 0.3, loyaltyIndex: 0.3, insecurityIndex: 32, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'osun', name: 'Osun', registeredVoters: 1900000, baseTurnout: 0.31, loyaltyIndex: 0.31, insecurityIndex: 24, threatType: 'banditry', religiousLean: 'mixed' },
	{ id: 'ekiti', name: 'Ekiti', registeredVoters: 1000000, baseTurnout: 0.3, loyaltyIndex: 0.31, insecurityIndex: 22, threatType: 'banditry', religiousLean: 'mixed' }
];

export const seededState = {
	id: 'nigeria',
	name: 'Nigeria',
	role: 'Presidential candidate',
	states
};
