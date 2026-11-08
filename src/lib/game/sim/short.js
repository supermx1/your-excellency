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
const thousands = (n) => (n >= 1000 ? `${Math.round(n / 1000)} thousand` : `${Math.round(n)}`);
const people = (n) =>
	n >= 1e6 ? `${Math.round(n / 1e6)} million` : `${Math.round(n / 1e3)} thousand`;
const stat = (run, y, key) => statsAt(run, defaultData.national, y).find((s) => s.key === key);
const warsBy = (run, y) => run.events.filter((e) => e.kind === 'war' && e.year <= y).length;
const standout = (run, a, b) => {
	for (const kind of NOTABLE) {
		const e = run.events.find(
			(x) => x.kind === kind && x.year > a && x.year <= b && (kind !== 'conquest' || x.annexed)
		); // a whole state falling, not one battle
		if (e) return `${e.year}: ${e.title}. `;
	}
	return '';
};
const statesAt = (run, y) => {
	const p = snap(run, y).polities;
	return p.length === 1 ? `${p[0].name} rules it all` : `${p.length} states share the land`;
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
 * With `town`, pixel-art cutaways join the map: the first railway, and the run's biggest world firsts.
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
			...presets.map((p) => p.description.split('. ')[0].replace(/\.?$/, '.')),
			rest.length
				? `I changed ${rest.map((c) => `${c.label.toLowerCase()} to ${c.value}`).join(', ')}.`
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
			say: `${standout(run, start, c1)}By ${c1}, ${statesAt(run, c1)}, after ${warsBy(run, c1)} wars.`,
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
			say: `${standout(run, c2, end)}By ${end}, ${warsBy(run, end)} wars. Ours had ${stat(run, end, 'wars').ours}.`,
			from: c2,
			to: end
		});
	} else {
		beats.push({
			say: `${standout(run, start, end)}By ${end}, ${warsBy(run, end)} wars.`,
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
			? ` Average income: ${thousands(income.theirs)} dollars a year. Ours: ${thousands(income.oursValue)}.`
			: '';
	beats.push({
		say: `${people(pop.value)} people, against ${people(pop.ours)} in ours.${earns} ${city}${city === 'Lagos' ? ' is still' : ', not Lagos, is'} the biggest city.${summary ? ` ${formedLine(summary)}` : ''}`,
		from: end,
		to: end,
		card: true
	});
	if (town) {
		addRailwayBeat(run, beats, start, end);
		addInventionBeats(run, beats);
	}
	return beats;
}

// One line per technology: what the state does, and the cutaway that shows it. The order is the pick
// order, best first: a Short shows at most INVENTION_SHOTS world firsts, one per scene.
const INVENTIONS = {
	'mars-landing': ['land people on Mars', 'mars'],
	'moon-base': ['build a base on the Moon', 'moon'],
	'crewed-spaceflight': ['send the first people into space', 'launch'],
	'reusable-rockets': ['land a rocket and fly it again', 'landing'],
	'space-station': ['build the first space station', 'orbit'],
	'interstellar-probe': ['send a probe to the stars', 'stars'],
	'asteroid-mining': ['mine an asteroid', 'asteroid'],
	satellite: ['launch the first satellite', 'launch'],
	'fusion-power': ['switch on fusion power', 'market'],
	'solar-power': ['make solar power cheap', 'market'],
	'mobile-phone': ['make the first mobile phone call', 'market'],
	television: ['broadcast the first television', 'market'],
	radio: ['broadcast the first radio', 'market'],
	'motor-car': ['build the first motor car', 'market']
};
const INVENTION_SHOTS = 3;
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
	'stars'
];

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

function addInventionBeats(run, beats) {
	const order = Object.keys(INVENTIONS);
	const picked = [];
	for (const techId of order) {
		const index = run.events.findIndex(
			(e) => e.kind === 'invention' && e.worldFirst && e.techId === techId
		);
		const scene = INVENTIONS[techId][1];
		if (index >= 0 && !picked.some((p) => p.scene === scene)) picked.push({ index, scene, techId });
		if (picked.length === INVENTION_SHOTS) break;
	}
	for (const { index, scene, techId } of picked.sort(
		(a, b) => run.events[a.index].year - run.events[b.index].year
	)) {
		const e = run.events[index];
		const name =
			run.history.find((h) => h.year === e.year)?.polities.find((p) => p.id === e.polityIds[0])
				?.name ?? e.polityIds[0];
		const worldYear = defaultData.tech.find((t) => t.id === techId)?.worldYear;
		addCutaway(
			run,
			beats,
			index,
			`${e.year}: ${does(name, INVENTIONS[techId][0])}.${sinceOurs(worldYear, e.year)}`,
			scene
		);
	}
}

/** Splits the map beat that holds the event: a cutaway line up to its year, the map after it. */
function addCutaway(run, beats, event, say, preset) {
	const year = run.events[event].year;
	const index = beats.findIndex((beat) => beat.from < year && year <= beat.to);
	if (index === -1) return;
	const beat = beats[index];
	const oldLead = standout(run, beat.from, beat.to);
	const laterLead = standout(run, year, beat.to);
	beats.splice(index, 0, { say, from: beat.from, to: year, town: { event, preset } });
	beat.from = year;
	beat.say = `${laterLead}${beat.say.slice(oldLead.length)}`;
}

function addRailwayBeat(run, beats, start, end) {
	const event = run.events.findIndex(
		(e) => e.techId === 'railway' && e.year > start && e.year <= end
	);
	if (event === -1) return;
	const rail = run.events[event];
	const ours = defaultData.tech.find((t) => t.id === 'railway')?.nigeriaYear;
	const gap = ours ? ours - rail.year : 0;
	const early =
		gap > 0
			? ` That's ${gap} years before Nigeria's first railway in our world.`
			: gap < 0
				? ` That's ${-gap} years after Nigeria's first railway in our world.`
				: '';
	const say = `${rail.year}: ${rail.title}.${early} Picture a trader carrying a sack from the market as the train pulls in.`;
	addCutaway(run, beats, event, say, 'station');
}

/** How often Nigeria formed across the summary runs, said the way a person would say it. */
function formedLine({ runs, nigeriaFormed: n }) {
	const lead = `I ran this world ${runs} times, and Nigeria`;
	if (n === 0) return `${lead} never formed. Not once.`;
	if (n === runs) return `${lead} formed every time.`;
	return `${lead} formed ${n === 1 ? 'only once' : `in ${n} of them`}.`;
}
const ease = (k) => k * k * (3 - 2 * k);

function townShot(run, beat) {
	if (beat.town == null) return null;
	const {
		event,
		preset = 'station',
		start = 0,
		end = 1,
		crowd = 18,
		zoom = 1.18,
		pace = 1
	} = beat.town;
	const source = Number.isInteger(event) ? run.events[event] : null;
	if (!source || source.year < beat.from || source.year > beat.to || beat.split || beat.card)
		throw new Error('A town shot needs an event index from the map beat’s years.');
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
		// What this state has built by then dresses the town: poles, masts, aerials, solar roofs, cars.
		techs: [
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
