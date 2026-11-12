// @ts-nocheck
// The switch menu. A scenario is only switch values plus a start year; the engine never changes.

const LEVELS = ['low', 'history', 'high'];
const year = (group, label, description, def = null) => ({
	group,
	label,
	description,
	type: 'year',
	default: def,
	min: 1850,
	max: 2100
});
const bool = (group, label, description) => ({
	group,
	label,
	description,
	type: 'bool',
	default: true
});
const num = (group, label, description, min, max) => ({
	group,
	label,
	description,
	type: 'number',
	default: 1,
	min,
	max
});
const pickOne = (group, label, description, options, def = 'history') => ({
	group,
	label,
	description,
	type: 'enum',
	default: def,
	options
});

export const SWITCHES = {
	britishConquest: bool(
		'History',
		'British conquest',
		'Britain attacks Lagos (1861) and the rest by 1903. An attack works only if Britain is far enough ahead in technology; a beaten attack comes back 10 years later, until 1914.'
	),
	indirectRule: bool(
		'History',
		'Indirect rule',
		'Britain rules through local rulers, who keep missionaries out where most people follow a faith with its own schools.'
	),
	amalgamation: bool(
		'History',
		'Amalgamation',
		'North and South are joined into one Nigeria in 1914.'
	),
	capitalToAbuja: bool(
		'History',
		'Capital moves to Abuja',
		'In 1991 Nigeria moves its capital to Abuja, in the middle of the country, if it exists and holds the FCT.'
	),
	independenceYear: year(
		'History',
		'Independence year',
		'The year Nigeria becomes independent, if it exists.',
		1960
	),
	civilWar: bool(
		'History',
		'Civil war',
		'The 1967–70 war, if there is a Nigeria for it to happen in and a coup has just shaken it.'
	),
	coups: pickOne('History', 'Military coups', 'Off, as in history, or more likely.', [
		'off',
		'history',
		'likely'
	]),
	militaryHandsBack: bool(
		'History',
		'Military hands back power',
		'Soldiers in power hand it back to civilians in time, as in 1979 and 1999.'
	),
	oilDiscovery: bool('History', 'Oil is found', 'Oil is discovered (Oloibiri, 1956).'),
	oilYear: year('History', 'Year oil is found', 'Move the discovery earlier or later.', 1956),
	learning: num(
		'People',
		'Learning speed',
		'How fast everyone learns and invents. 3 = the 200 IQ world.',
		1,
		3
	),
	health: num(
		'People',
		'Health',
		'Multiplies death rates for everyone (lower is healthier).',
		0.5,
		1.5
	),
	onePeople: pickOne(
		'People',
		'One people',
		'Everyone shares one language, one ethnic group and one faith, and nobody converts. "Largest" takes the language and the faith most people have when the run starts.',
		['off', 'largest', 'islam', 'christian', 'traditional'],
		'off'
	),
	trust: pickOne(
		'People',
		'Trust between groups',
		'How easily neighbours fall into conflict. Applies to everyone equally.',
		LEVELS
	),
	oilInGround: bool('Land', 'Oil in the ground', 'Whether there is any oil to find.'),
	malaria: num('Land', 'Malaria burden', 'Multiplies how much malaria raises deaths.', 0.5, 1.5),
	drought: num(
		'Land',
		'Drought severity',
		'Multiplies the strength of the real droughts.',
		0.5,
		1.5
	),
	power24hFromYear: year(
		'Policy',
		'24-hour power from',
		'Reliable electricity from this year (blank = as in history).'
	),
	freeSchoolingFromYear: year(
		'Policy',
		'Free schooling from',
		'Free schools for every child from this year (1976 in history, Universal Primary Education; blank = never).',
		1976
	),
	corruption: pickOne('Policy', 'Corruption', 'Low, as in history, or high.', LEVELS),
	religiousTolerance: pickOne(
		'Religion',
		'Religious tolerance',
		'How much religious difference turns into tension, for every faith alike.',
		LEVELS
	),
	christianMissions: bool(
		'Religion',
		'Christian missions',
		'Missionaries land on the coast from 1842 and move inland wherever rulers let them.'
	),
	stateReligion: pickOne(
		'Religion',
		'State religion',
		'Secular states, each state chooses, or as in history.',
		['secular', 'choose', 'history']
	),
	sharia: bool(
		'Religion',
		'Sharia in the north',
		'Twelve northern states adopt Sharia law (1999–2001).'
	)
};

/** @returns {Record<string, any>} */
export const defaultSwitches = () =>
	Object.fromEntries(Object.entries(SWITCHES).map(([k, s]) => [k, s.default]));

export const PRESETS = {
	neverColonized: {
		label: 'Never colonized',
		description:
			'Britain never conquers the region. The states of 1850 carry on and the rest of the world stays real.',
		startYear: 1850,
		switches: { britishConquest: false, amalgamation: false }
	},
	genius: {
		label: '200 IQ',
		hook: 'I gave every Nigerian a 200 IQ: everyone learns and invents three times faster.',
		description:
			'Everyone learns and invents three times faster. Greed, fear and ambition stay the same.',
		startYear: 1850,
		switches: { learning: 3 }
	},
	neverJoined: {
		label: 'North and South never join',
		hook: 'What if North and South were never joined into one Nigeria?',
		description:
			'Britain still conquers the region, but there is no 1914 amalgamation. North and South stay apart.',
		startYear: 1850,
		switches: { britishConquest: true, amalgamation: false }
	},
	noOil: {
		label: 'No oil',
		hook: 'What if Nigeria never had any oil?',
		description: 'There is no oil in the ground to find. Everything else is as in history.',
		startYear: 1950,
		switches: { oilInGround: false }
	},
	lowCorruption: {
		label: 'Low corruption',
		hook: 'What if Nigeria had far less corruption?',
		description:
			'Every government is steadier because it loses less to graft. Everything else is as in history.',
		startYear: 1950,
		switches: { corruption: 'low' }
	},
	militaryStays: {
		label: 'Military never leaves',
		hook: 'What if the military never handed power back in 1999?',
		description:
			'The soldiers in power in 1999 never hand over to an elected government. Coups can still swap one general for another. Everything else is as in history.',
		startYear: 1999,
		switches: { militaryHandsBack: false }
	},
	onePeople: {
		label: 'One people',
		hook: 'What if Nigeria had one language, one ethnic group and one religion?',
		description:
			'From 1850 everyone speaks the language and holds the faith that most people have, and nobody converts. Nothing else changes.',
		startYear: 1850,
		switches: { onePeople: 'largest' }
	}
};

/**
 * @param {unknown} input
 * @returns {{ ok: true, switches: Record<string, any> } | { ok: false, error: string }}
 */
export function validateSwitches(input) {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		return { ok: false, error: 'switches must be an object' };
	const out = defaultSwitches();
	for (const [key, value] of Object.entries(input)) {
		const s = Object.hasOwn(SWITCHES, key) ? SWITCHES[key] : null;
		if (!s) return { ok: false, error: `unknown switch ${key}` };
		const bad = (why) => ({ ok: false, error: `${key}: ${why}` });
		if (s.type === 'bool' && typeof value !== 'boolean') return bad('must be true or false');
		if (s.type === 'enum' && !s.options.includes(value))
			return bad(`must be one of ${s.options.join(', ')}`);
		if (s.type === 'number' && !(typeof value === 'number' && value >= s.min && value <= s.max))
			return bad(`must be ${s.min}–${s.max}`);
		if (
			s.type === 'year' &&
			value !== null &&
			!(Number.isInteger(value) && value >= s.min && value <= s.max)
		)
			return bad(`must be a year ${s.min}–${s.max}`);
		out[key] = value;
	}
	return { ok: true, switches: out };
}
