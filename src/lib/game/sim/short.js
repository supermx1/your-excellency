// @ts-nocheck
// Shorts: a ~40 s vertical map clip in the owner's voice, which he plays and reacts to in Cap.
// shortScript drafts the lines from a run (he can edit them before they are voiced); planShort times
// each line's years to its audio; shortSceneAt says what each frame shows. Pure functions.
import { scenarioCard, captionChunks } from './export.js';
import { frameAt } from './frame.js';
import { realFrame, statsAt, captionsAt, endingRows } from './hud.js';
import { defaultData } from './data/index.js';
import { PRESETS } from './switches.js';
import { polityColor } from './colors.js';
import { verb } from './rules/conflict.js';

const NOTABLE = ['union', 'secession', 'conquest', 'history', 'coup', 'war']; // what makes a line, best first
const snap = (run, y) => run.history.find((h) => h.year === y) ?? run.history.at(-1);
/** Dollars to the nearest hundred, written the way a screen shows them: 5680 → "5,700". */
const dollars = (n) => (Math.round(n / 100) * 100).toLocaleString('en-US');
const people = (n) =>
	n >= 1e6 ? `${Math.round(n / 1e6)} million` : `${Math.round(n / 1e3)} thousand`;
const stat = (run, y, key) => statsAt(run, defaultData.national, y).find((s) => s.key === key);
const warsBy = (run, y) => run.events.filter((e) => e.kind === 'war' && e.year <= y).length;
const wars = (n) => `${n} war${n === 1 ? '' : 's'}`;
const standout = (run, a, b) => {
	for (const kind of NOTABLE) {
		const e = run.events.find(
			(x) => x.kind === kind && x.year > a && x.year <= b && (kind !== 'conquest' || x.annexed)
		); // a whole state falling, not one battle
		// "Military coup (1983)" already has its year in front: "1983: Military coup."
		if (e) return `${e.year}: ${e.title.replace(/ \((?:\w+ )?\d{4}\)$/, '')}. `;
	}
	return '';
};
const statesAt = (run, y) => {
	const p = snap(run, y).polities;
	return p.length === 1
		? `${p[0].name} ${verb(p[0].name, 'rules', 'rule')} it all`
		: `${p.length} states share the land`;
};

/** Every what-if preset these switches match: a run can be Never colonized and 200 IQ at once. */
const presetsOf = (inputs) =>
	Object.values(PRESETS).filter((p) =>
		Object.entries(p.switches).every(([k, v]) => inputs.switches[k] === v)
	);

/** The badge on the Short: every preset it combines ("Never colonized + 200 IQ"), else "What if". */
export const shortLabel = (inputs) =>
	presetsOf(inputs)
		.map((p) => p.label)
		.join(' + ') || 'What if';

/**
 * The draft script: one line per beat, each playing a stretch of years. Saved as JSON for the owner to edit.
 * With `town`, pixel-art cutaways show what the land gains: world firsts and new technologies, each
 * set against when it reached Nigeria in our world.
 * @returns {{ say: string, from: number, to: number, split?: boolean, card?: boolean, town?: object }[]}
 */
export function shortScript(run, inputs, summary = null, { town = false } = {}) {
	const start = run.history[0].year;
	const end = run.history.at(-1).year;
	const card = scenarioCard(inputs);
	// Every preset the switches match (Never colonized and 200 IQ can both hold), then any other change.
	const presets = presetsOf(inputs);
	const covered = new Set(presets.flatMap((p) => Object.keys(p.switches)));
	const rest = card.changes.filter((c) => !covered.has(c.key));
	const premise =
		[
			// A preset's own opening line, else the first sentence of its description.
			...presets.map((p) => p.hook ?? p.description.split('. ')[0].replace(/\.?$/, '.')),
			rest.length
				? `I set ${rest.map((c) => `${c.label.toLowerCase()}${/ from$/.test(c.label) ? '' : ' to'} ${c.value}`).join(', ')}.`
				: ''
		]
			.filter(Boolean)
			.join(' ') || 'Every switch as in history.';
	const beats = [
		{ say: `${premise} I ran Nigeria from ${start} to ${end}.`, from: start, to: start }
	];

	if (end - start >= 30) {
		const c1 = start + 10 < 1914 && 1914 < end - 20 ? 1914 : start + Math.round((end - start) / 3);
		const c2 = c1 + 10 < 1960 && 1960 < end - 10 ? 1960 : c1 + Math.round((end - c1) / 2);
		beats.push({
			say: `${standout(run, start, c1)}By ${c1}, ${statesAt(run, c1)}, after ${wars(warsBy(run, c1))}.`,
			from: start,
			to: c1
		});
		beats.push({
			say: `${standout(run, c1, c2)}By ${c2}, ${people(snap(run, c2).totals.pop)} people.`,
			from: c1,
			to: c2
		});
		const ours = captionsAt(run, c2 + 0.99, 1)
			.find((c) => c.ours)
			?.ours?.replace('In our world: ', '');
		const nigeria = snap(run, c2 + 1).polities.some((p) => /nigeria/i.test(p.name));
		beats.push({
			say: `${ours ? `In our world, ${ours.replace(/\.$/, '')}.` : 'Our world on top, theirs below.'} Here, ${nigeria ? 'Nigeria stands too' : 'there is no Nigeria'}.`,
			from: c2,
			to: c2,
			split: true
		});
		beats.push({
			say: `${standout(run, c2, end)}By ${end}, ${wars(warsBy(run, end))}. Ours had ${stat(run, end, 'wars').ours}.`,
			from: c2,
			to: end
		});
	} else {
		beats.push({
			say: `${standout(run, start, end)}By ${end}, ${wars(warsBy(run, end))}.`,
			from: start,
			to: end
		});
	}

	const rows = endingRows(run, defaultData.national, summary);
	const city = rows.find((r) => r.label === 'Biggest city').theirs;
	const pop = stat(run, end, 'pop');
	const income = rows.find((r) => r.label === 'Income per person');
	const earns =
		income.theirs && income.oursValue
			? ` Average income: ${dollars(income.theirs)} dollars a year. Ours: ${dollars(income.oursValue)}.`
			: '';
	const power =
		inputs.switches.power24hFromYear != null ? ` ${lightsLine(snap(run, end), end)}` : '';
	beats.push({
		say: `${people(pop.value)} people, against ${people(pop.ours)} in ours.${power}${earns} ${city}${city === 'Lagos' ? ' is still' : ', not Lagos, is'} the biggest city.${summary ? ` ${formedLine(summary)}` : ''}`,
		from: end,
		to: end,
		card: true
	});
	if (town) addCutaways(run, beats, start, end, inputs);
	return beats;
}

// One line per technology: what the state does, and the cutaway that shows it. The order is the pick
// order, best first. At least one is picked when the run has a qualifying world first.
const INVENTIONS = {
	'mars-landing': ['land people on Mars', 'mars'],
	'moon-base': ['build a base on the Moon', 'moon'],
	'crewed-spaceflight': ['send the first people into space', 'launch'],
	'reusable-rockets': ['land a rocket and fly it again', 'landing'],
	'space-station': ['build the first space station', 'orbit'],
	'interstellar-probe': ['send a probe to the stars', 'stars'],
	'asteroid-mining': ['mine an asteroid', 'asteroid'],
	satellite: ['launch the first satellite', 'launch'],
	'fusion-power': ['switch on fusion power', 'fusion'],
	'conversational-ai': ['build the first AI you can talk to', 'signal'],
	vaccines: ['vaccinate every child', 'clinic'],
	'malaria-control': ['beat malaria with bed nets and new drugs', 'clinic'],
	'green-revolution': ['grow the first high-yield crops', 'fields'],
	'mobile-phone': ['make the first mobile phone call', 'signal'],
	internet: ['switch on the first internet', 'internet'],
	antibiotics: ['make the first antibiotics', 'clinic'],
	fertiliser: ['make the first synthetic fertiliser', 'fields'],
	'solar-power': ['make solar power cheap', 'market'],
	television: ['broadcast the first television', 'broadcast'],
	radio: ['broadcast the first radio', 'broadcast'],
	'motor-car': ['build the first motor car', 'market']
};
const SHOTS = 4;
const SPACING = 15; // years between scenes, so they don't bunch in one decade
// Each technology a state can take up, and the scene that shows it arriving.
const MILESTONE_SCENES = {
	railway: 'station',
	'steam-engine': 'station',
	electricity: 'home-power',
	quinine: 'clinic',
	'smallpox-vaccine': 'clinic',
	'germ-theory': 'clinic',
	antibiotics: 'clinic',
	insecticides: 'clinic',
	vaccines: 'clinic',
	'oral-rehydration': 'clinic',
	'malaria-control': 'clinic',
	fertiliser: 'fields',
	'green-revolution': 'fields',
	radio: 'broadcast',
	television: 'broadcast',
	computer: 'internet',
	internet: 'internet',
	telephone: 'signal',
	satellite: 'launch', // its first satellite going up
	'mobile-phone': 'signal',
	'motor-car': 'market',
	'solar-power': 'market'
};
/** The cutaway scenes the Short page can draw. */
export const CUTAWAYS = [
	'station',
	'market',
	'launch',
	'landing',
	'orbit',
	'moon',
	'mars',
	'asteroid',
	'stars',
	'clinic',
	'fields',
	'fusion',
	'signal',
	'school',
	'internet',
	'broadcast',
	'home-power',
	'workshop',
	'battle'
];

/** "Everyone has electricity, 23 hours a day. Ours: 57% of homes." */
function lightsLine({ totals: { electricityAccess: access = 0, powerService: service = 0 } }, end) {
	const who = access >= 0.995 ? 'Everyone has' : `${Math.round(access * 100)}% of homes have`;
	const hours = access > 0.005 ? Math.round((24 * service) / access) : 0;
	const ours = defaultData.development.snapshots.filter((x) => x.year <= end).at(-1)?.national
		.electricityAccess?.value;
	return `${who} electricity, ${hours} hours a day.${ours != null ? ` Ours: ${Math.round(ours * 100)}% of homes.` : ''}`;
}

/** The scene for the power switch: the year the lights come on and stay on. */
function powerCutaway(inputs, inRange) {
	const year = inputs.switches.power24hFromYear;
	if (year == null || !inRange(year)) return null;
	return {
		year,
		say: `${year}: The lights come on, and they stay on. Day and night, no more power cuts.`,
		town: { at: year, title: 'Power that never goes off', preset: 'home-power' }
	};
}

/** "Kingdom of Lagos sends the first people into space" (its verb agrees with plural names too). */
function does(name, phrase) {
	const [first, ...rest] = phrase.split(' ');
	const singular = /(ch|sh|s|x|z)$/.test(first) ? `${first}es` : `${first}s`;
	return `${name} ${[verb(name, singular, first), ...rest].join(' ')}`;
}

const sinceOurs = (worldYear, year) =>
	worldYear == null
		? ' Nobody in our world has done that yet.'
		: worldYear > year
			? ` That's ${worldYear - year} years before anyone in our world did it.`
			: '';

function inventionCutaways(run, inRange) {
	return Object.entries(INVENTIONS).flatMap(([techId, [phrase, preset]]) => {
		const event = run.events.findIndex(
			(e) => e.kind === 'invention' && e.worldFirst && e.techId === techId && inRange(e.year)
		);
		if (event < 0) return [];
		const e = run.events[event];
		const polity = e.polityIds[0];
		const name =
			run.history.find((h) => h.year === e.year)?.polities.find((p) => p.id === polity)?.name ??
			polity;
		const worldYear = defaultData.tech.find((t) => t.id === techId)?.worldYear;
		return [
			{
				year: e.year,
				say: `${e.year}: ${does(name, phrase)}.${sinceOurs(worldYear, e.year)}`,
				town: { event, preset }
			}
		];
	});
}

/** How far a milestone is from when it reached Nigeria in our world. */
function againstOurs(techId, year) {
	const ours = defaultData.tech.find((t) => t.id === techId)?.nigeriaYear;
	if (ours == null) return { gap: 0, said: '' };
	const gap = ours - year;
	const n = Math.abs(gap);
	const said = gap
		? ` That's ${n} year${n === 1 ? '' : 's'} ${gap > 0 ? 'earlier' : 'later'} than in our Nigeria.`
		: ' The same year as in our Nigeria.';
	return { gap: n, said };
}

/** The first time each technology reaches any state in the run, with its scene and its gap from ours. */
function milestoneCutaways(run, inRange) {
	const seen = new Set();
	return run.events.flatMap((e, event) => {
		const preset = MILESTONE_SCENES[e.techId];
		if (!preset || !['adoption', 'invention'].includes(e.kind) || !inRange(e.year)) return [];
		if (seen.has(e.techId)) return [];
		seen.add(e.techId);
		const { gap, said } = againstOurs(e.techId, e.year);
		return [{ year: e.year, gap, say: `${e.year}: ${e.title}.${said}`, town: { event, preset } }];
	});
}

const peaceOf = (run, war) => run.events.find((e) => e.kind === 'peace' && e.warId === war.warId);
const dead = (n) =>
	n >= 1e6
		? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} million people`
		: `${Math.max(1, Math.round(n / 1e3))} thousand people`;

/** The run's deadliest war, as a battle scene: who fought, and how many died before peace. */
function battleCutaway(run, inRange, end) {
	let best = null;
	for (const [event, war] of run.events.entries()) {
		if (war.kind !== 'war' || !inRange(war.year)) continue;
		const deaths = peaceOf(run, war)?.deaths ?? 0;
		if (!best || deaths > best.deaths) best = { event, war, deaths };
	}
	if (!best) return null;
	const peace = peaceOf(run, best.war);
	const toll = peace
		? best.deaths
			? ` ${dead(best.deaths)} die before peace in ${peace.year}.`
			: ''
		: ` It is still going in ${end}.`;
	const { year, title } = best.war;
	return { year, say: `${year}: ${title}.${toll}`, town: { event: best.event, preset: 'battle' } };
}

/**
 * Up to four scenes of what the land gains and loses: the run's world firsts, its deadliest war,
 * then the milestones furthest from when they reached our Nigeria (earlier or later), one per scene
 * and spread across the run.
 */
function addCutaways(run, beats, start, end, inputs) {
	const inRange = (year) => year > start && year <= end;
	const premise = powerCutaway(inputs, inRange); // the switch the Short is about comes first
	const firsts = inventionCutaways(run, inRange).slice(0, 3); // space to the Moon to Mars, when a run has them
	const war = battleCutaway(run, inRange, end);
	const milestones = milestoneCutaways(run, inRange).sort((a, b) => b.gap - a.gap);
	const picked = [];
	for (const shot of [premise, ...firsts, war, ...milestones].filter(Boolean)) {
		if (picked.length === SHOTS) break;
		const clash = picked.some(
			(p) =>
				p.town.event === shot.town.event ||
				p.town.preset === shot.town.preset ||
				Math.abs(p.year - shot.year) < SPACING
		);
		if (!clash) picked.push(shot);
	}
	for (const shot of picked.sort((a, b) => a.year - b.year)) addCutaway(run, beats, shot);
}

/** Splits the map beat that holds the event: a cutaway line up to its year, the map after it. */
function addCutaway(run, beats, { year, say, town }) {
	const index = beats.findIndex((beat) => !beat.town && beat.from < year && year <= beat.to);
	if (index === -1) return;
	const beat = beats[index];
	const oldLead = standout(run, beat.from, beat.to);
	const laterLead = standout(run, year, beat.to);
	beats.splice(index, 0, { say, from: beat.from, to: year, town });
	beat.from = year;
	beat.say = `${laterLead}${beat.say.slice(oldLead.length)}`;
}

/**
 * What the summary runs disagreed on, said the way a person would say it. Nigeria first; when every
 * run agrees on it (amalgamation off means it never forms), a civil war or a war count instead.
 */
function formedLine({ runs, nigeriaFormed: n, withCivilWar = 0, withWar = 0 }) {
	const lead = `I ran this world ${runs} times, and`;
	// With no Nigeria in any run, a "civil war" count reads as a contradiction of the card.
	if (n === 0) return `${lead} Nigeria never formed. Not once.`;
	const varied = [
		[n, 'Nigeria formed'],
		[withCivilWar, 'a civil war broke out'],
		[withWar, 'a war broke out']
	].find(([k]) => k > 0 && k < runs);
	if (varied) {
		const [k, what] = varied;
		return `${lead} ${what} ${k === 1 ? 'only once' : `in ${k} of them`}.`;
	}
	return n === 0 ? `${lead} Nigeria never formed. Not once.` : `${lead} Nigeria formed every time.`;
}
const ease = (k) => k * k * (3 - 2 * k);

function cutawaySource(run, { event, familyEvent, at, title }) {
	if (Number.isInteger(event)) return run.events[event];
	// A scene for a switch rather than an event: the year and a title, under the biggest state's flag.
	if (Number.isInteger(at) && typeof title === 'string') {
		const biggest = run.history
			.find((h) => h.year === at)
			?.polities.toSorted((a, b) => (b.cellIds?.length ?? 0) - (a.cellIds?.length ?? 0))[0];
		return { year: at, title, polityIds: biggest ? [biggest.id] : [] };
	}
	if (
		!Array.isArray(familyEvent) ||
		familyEvent.length !== 3 ||
		!familyEvent.every(Number.isInteger)
	)
		return null;
	const [f, m, i] = familyEvent;
	const family = run.families?.[f];
	const member = family?.members[m];
	const record = member?.lifeEvents[i];
	if (!record) return null;
	// The state ruling the family's home that year, so the scene flies its flag.
	const ruler = run.history
		.find((h) => h.year === record.year)
		?.polities.find((p) => p.cellIds?.includes(member.cell));
	return {
		...record,
		polityIds: ruler ? [ruler.id] : [],
		title: `${member.name} ${family.surname} ${record.text}`
	};
}

function townShot(run, beat) {
	if (beat.town == null) return null;
	const { preset = 'station', start = 0, end = 1, crowd = 18, zoom = 1.18, pace = 1 } = beat.town;
	const source = cutawaySource(run, beat.town);
	if (!source || source.year < beat.from || source.year > beat.to || beat.split || beat.card)
		throw new Error('A town shot needs a simulation or family event from the map beat’s years.');
	if (
		!CUTAWAYS.includes(preset) ||
		![start, end, crowd, zoom, pace].every(Number.isFinite) ||
		start < 0 ||
		end > 1 ||
		start >= end ||
		!Number.isInteger(crowd) ||
		crowd < 0 ||
		crowd > 24 ||
		zoom < 1 ||
		zoom > 1.4 ||
		pace < 0.5 ||
		pace > 2
	)
		throw new Error('Invalid town shot settings. Check preset, start, end, crowd, zoom and pace.');
	const polityId = source.polityIds?.[0];
	return {
		preset,
		start,
		end,
		crowd,
		zoom,
		pace,
		year: source.year,
		title: source.title,
		tech: source.techId ?? null,
		color: polityId ? polityColor(polityId) : '#d0a24a',
		// A battle shows both sides in their map colours, and which of them won (-1: never ended).
		...(preset === 'battle' && {
			rivals: (source.polityIds ?? []).slice(0, 2).map(polityColor),
			winner: (source.polityIds ?? []).indexOf(peaceOf(run, source)?.winner)
		}),
		// What this state has built by then dresses the town: poles, masts, aerials, solar roofs, cars.
		techs: polityId
			? [
					...new Set(
						run.events
							.filter(
								(e) =>
									(e.kind === 'invention' || e.kind === 'adoption') &&
									e.polityIds?.[0] === polityId &&
									e.year <= source.year
							)
							.map((e) => e.techId)
					)
				]
			: []
	};
}

/**
 * Times the beats to their voice clips.
 * @param {ReturnType<typeof shortScript>} beats @param {{ file: string, seconds: number }[]} voices one per beat
 */
export function planShort(
	run,
	beats,
	voices,
	{ gap = 0.35, minBeat = 2.5, endHold = 3, town = false } = {}
) {
	const end = run.history.at(-1).year;
	const segments = [];
	const cues = [];
	let v = 0;
	beats.forEach((b, i) => {
		const seconds = voices[i]?.seconds ?? 0;
		const length = Math.max(minBeat, seconds + gap);
		const cutaway = town ? townShot(run, b) : null;
		if (seconds) cues.push({ id: `line-${i}`, file: voices[i].file, start: v, seconds });
		segments.push({
			...b,
			beat: i,
			v0: v,
			v1: v + length,
			phase: b.card ? 'card' : b.split ? 'split' : 'run',
			town: cutaway && {
				...cutaway,
				in: v + length * cutaway.start,
				out: v + length * cutaway.end
			},
			captions: seconds ? captionChunks(b.say, seconds) : []
		});
		v += length;
	});
	segments.push({
		from: end,
		to: end,
		beat: null,
		v0: v,
		v1: v + endHold,
		phase: 'card',
		captions: []
	});
	const duration = v + endHold;
	const at = (time) => {
		const t = Math.min(duration, Math.max(0, time));
		const s = segments.findLast((x) => x.v0 <= t) ?? segments[0];
		const k = s.v1 > s.v0 ? Math.min(1, (t - s.v0) / (s.v1 - s.v0)) : 1;
		const year = s.phase === 'run' ? s.from + (s.to - s.from) * ease(k) : s.to;
		const line = s.captions.find((c) => t - s.v0 >= c.start && t - s.v0 < c.end)?.text ?? null;
		const shot = s.town;
		if (shot && t >= shot.in && t < shot.out) {
			return {
				phase: s.phase,
				year,
				line,
				town: { ...shot, progress: (t - shot.in) / (shot.out - shot.in), elapsed: t - shot.in }
			};
		}
		return { phase: s.phase, year, line };
	};
	return { duration, cues, segments, at };
}

// The Short's scorecard: how people live, not only how many there are and how often they fought.
const SCORECARD = [
	'Population',
	'Income per person',
	'Has electricity',
	'Can read (school)',
	'Life expectancy',
	'Wars',
	'Biggest city',
	'Religious mix',
	'People in space'
];

/** What one frame of the Short shows. */
export function shortSceneAt(run, plan, time, summary = null) {
	const { phase, year, line, town } = plan.at(time);
	if (town) return { phase: 'town', town, line };
	const shown = phase === 'split' ? year + 1 : year; // a split shows the end of its year
	const pick = (key) => stat(run, shown, key);
	const rows = phase === 'card' ? endingRows(run, defaultData.national, summary) : null;
	return {
		phase,
		year: Math.floor(year),
		frame: frameAt(run, shown),
		real: phase === 'split' ? realFrame(shown) : null,
		kicker: phase === 'split' ? `End of ${year}` : null,
		line,
		stats: [pick('pop'), pick('wars')],
		card: rows && {
			rows: SCORECARD.map((l) => rows.find((r) => r.label === l)).filter(Boolean),
			runs: rows.find((r) => r.label.startsWith('In '))
		}
	};
}
