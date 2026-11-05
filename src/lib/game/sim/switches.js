// @ts-nocheck
// The switch menu. A scenario is only switch values plus a start year; the engine never changes.

const LEVELS = ['low', 'history', 'high'];
const year = (group, label, description, def = null) => ({ group, label, description, type: 'year', default: def, min: 1850, max: 2100 });
const bool = (group, label, description) => ({ group, label, description, type: 'bool', default: true });
const num = (group, label, description, min, max) => ({ group, label, description, type: 'number', default: 1, min, max });
const pickOne = (group, label, description, options, def = 'history') => ({ group, label, description, type: 'enum', default: def, options });

export const SWITCHES = {
	britishConquest: bool('History', 'British conquest', 'Britain takes Lagos (1861) and conquers the rest by 1903.'),
	amalgamation: bool('History', 'Amalgamation', 'North and South are joined into one Nigeria in 1914.'),
	independenceYear: year('History', 'Independence year', 'The year Nigeria becomes independent, if it exists.', 1960),
	civilWar: bool('History', 'Civil war', 'The 1967–70 war, if there is a Nigeria for it to happen in.'),
	coups: pickOne('History', 'Military coups', 'Off, as in history, or more likely.', ['off', 'history', 'likely']),
	oilDiscovery: bool('History', 'Oil is found', 'Oil is discovered (Oloibiri, 1956).'),
	oilYear: year('History', 'Year oil is found', 'Move the discovery earlier or later.', 1956),
	learning: num('People', 'Learning speed', 'How fast everyone learns and invents. 3 = the 200 IQ world.', 1, 3),
	health: num('People', 'Health', 'Multiplies death rates for everyone (lower is healthier).', 0.5, 1.5),
	trust: pickOne('People', 'Trust between groups', 'How easily neighbours fall into conflict. Applies to everyone equally.', LEVELS),
	oilInGround: bool('Land', 'Oil in the ground', 'Whether there is any oil to find.'),
	malaria: num('Land', 'Malaria burden', 'Multiplies how much malaria raises deaths.', 0.5, 1.5),
	drought: num('Land', 'Drought severity', 'Multiplies the strength of the real droughts.', 0.5, 1.5),
	power24hFromYear: year('Policy', '24-hour power from', 'Reliable electricity from this year (blank = as in history).'),
	freeSchoolingFromYear: year('Policy', 'Free schooling from', 'Free schools for every child from this year.'),
	corruption: pickOne('Policy', 'Corruption', 'Low, as in history, or high.', LEVELS),
	religiousTolerance: pickOne('Religion', 'Religious tolerance', 'How much religious difference turns into tension, for every faith alike.', LEVELS),
	christianMissions: bool('Religion', 'Christian missions', 'Missionaries arrive from 1842.'),
	stateReligion: pickOne('Religion', 'State religion', 'Secular states, each state chooses, or as in history.', ['secular', 'choose', 'history']),
	sharia: bool('Religion', 'Sharia in the north', 'Twelve northern states adopt Sharia law (1999–2001).')
};

/** @returns {Record<string, any>} */
export const defaultSwitches = () => Object.fromEntries(Object.entries(SWITCHES).map(([k, s]) => [k, s.default]));

export const PRESETS = {
	neverColonized: {
		label: 'Never colonized',
		description: 'Britain never conquers the region. The states of 1850 carry on and the rest of the world stays real.',
		startYear: 1850,
		switches: { britishConquest: false, amalgamation: false }
	},
	genius: {
		label: '200 IQ',
		description: 'Everyone learns and invents three times faster. Greed, fear and ambition stay the same.',
		startYear: 1960,
		switches: { learning: 3 }
	}
};

/**
 * @param {unknown} input
 * @returns {{ ok: true, switches: Record<string, any> } | { ok: false, error: string }}
 */
export function validateSwitches(input) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'switches must be an object' };
	const out = defaultSwitches();
	for (const [key, value] of Object.entries(input)) {
		const s = SWITCHES[key];
		if (!s) return { ok: false, error: `unknown switch ${key}` };
		const bad = (why) => ({ ok: false, error: `${key}: ${why}` });
		if (s.type === 'bool' && typeof value !== 'boolean') return bad('must be true or false');
		if (s.type === 'enum' && !s.options.includes(value)) return bad(`must be one of ${s.options.join(', ')}`);
		if (s.type === 'number' && !(typeof value === 'number' && value >= s.min && value <= s.max)) return bad(`must be ${s.min}–${s.max}`);
		if (s.type === 'year' && value !== null && !(Number.isInteger(value) && value >= s.min && value <= s.max)) return bad(`must be a year ${s.min}–${s.max}`);
		out[key] = value;
	}
	return { ok: true, switches: out };
}
