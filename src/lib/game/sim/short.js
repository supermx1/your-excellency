// @ts-nocheck
// Shorts: a ~40 s vertical map clip in the owner's voice, which he plays and reacts to in Cap.
// shortScript drafts the lines from a run (he can edit them before they are voiced); planShort times
// each line's years to its audio; shortSceneAt says what each frame shows. Pure functions.
import { scenarioCard, captionChunks } from './export.js';
import { frameAt, warsDuring } from './frame.js';
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
const wars = (n) => `${n} war${n === 1 ? '' : 's'}`;
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
 * With `town`, pixel-art cutaways illustrate milestones and events in the run's family records.
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
			? ` Average income: ${thousands(income.theirs)} dollars a year. Ours: ${thousands(income.oursValue)}.`
			: '';
	beats.push({
		say: `${people(pop.value)} people, against ${people(pop.ours)} in ours.${earns} ${city}${city === 'Lagos' ? ' is still' : ', not Lagos, is'} the biggest city.${summary ? ` ${formedLine(summary)}` : ''}`,
		from: end,
		to: end,
		card: true
	});
	if (town) addCutaways(run, beats, start, end);
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
const STORY_SHOTS = 3;
const COMMUNICATION_SCENES = { internet: 'internet', radio: 'broadcast', television: 'broadcast' };
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
	'workshop'
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

// The family thread: one of the run's four families carries the Short, from a first milestone through
// its hardest moment (tied to the war on the map when there is one) to how its line ends up.
const WEIGHT = {
	'no-school': 3,
	'savings-gone': 3,
	hardship: 2,
	stays: 2,
	migrates: 2,
	business: 2,
	school: 1,
	reads: 1,
	electricity: 1,
	work: 1
};
const LOW = ['no-school', 'savings-gone', 'hardship', 'stays']; // the hard moment, worst first
const UP = ['business', 'migrates', 'electricity', 'work', 'reads', 'school'];
const LIFE_SCENES = {
	school: 'school',
	'no-school': 'school',
	reads: 'school',
	electricity: 'home-power',
	business: 'workshop',
	'savings-gone': 'market',
	hardship: 'market',
	stays: 'market',
	migrates: 'market'
};
const WORK_SCENES = {
	farmer: 'fields',
	herder: 'fields',
	fisher: 'fields',
	teacher: 'school',
	engineer: 'workshop',
	nurse: 'clinic',
	artisan: 'workshop',
	'factory worker': 'workshop'
};
const RELATION = ['', 'child', 'grandchild', 'great-grandchild'];
const cellName = (id) => defaultData.cells.find((c) => c.id === id)?.name ?? id;
const job = (e) => e.text.replace(/^works as an? /, '');
const sceneOf = (e) =>
	e.kind === 'work' ? (WORK_SCENES[job(e)] ?? 'market') : LIFE_SCENES[e.kind];

/** Where a member lived in `year`: where they were born until they moved. */
function cellAt(member, year) {
	const moved = member.lifeEvents.find((e) => e.kind === 'migrates')?.year;
	return moved != null && year < moved ? (member.bornIn ?? member.cell) : member.cell;
}

/** The state ruling a cell in `year`. */
const rulerAt = (run, year, cellId) =>
	snap(run, year).polities.find((p) => p.cellIds?.includes(cellId));

/** Whether the state ruling where the member lived was at war that year. */
function warHere(run, member, year) {
	const ruler = rulerAt(run, year, cellAt(member, year));
	return !!ruler && warsDuring(run, year).some((pair) => pair.includes(ruler.id));
}

/** The youngest working adult still alive at the end: who the family is by then. */
const heirOf = (family, end) =>
	family.members.findLast((m) => !m.died && end - m.born >= 18 && m.occupation !== 'child');

/**
 * The family with the most turns in its story, and up to three moments from it in year order: a
 * milestone, its hard moment (one the map's wars caused if it can, near the middle of the run), and
 * a later milestone, the heir's own if they have one.
 */
function familyThread(run, inRange, start, end) {
	const lives = (run.families ?? []).map((family, f) => ({
		family,
		f,
		moments: family.members
			.flatMap((member, m) =>
				member.lifeEvents.map((e, i) => ({ m, i, member, e, scene: sceneOf(e) }))
			)
			.filter((x) => x.scene && inRange(x.e.year))
			.sort((a, b) => a.e.year - b.e.year)
	}));
	const score = (l) => l.moments.reduce((s, x) => s + (WEIGHT[x.e.kind] ?? 0), 0);
	const best = lives.reduce((a, b) => (score(b) > score(a) ? b : a), lives[0]);
	if (!best?.moments.length) return null;
	const { moments } = best;
	const middle = (start + end) / 2;
	const war = (x) => (warHere(run, x.member, x.e.year) ? 1 : 0);
	const low = moments
		.filter((x) => LOW.includes(x.e.kind))
		.sort(
			(a, b) => war(b) - war(a) || Math.abs(a.e.year - middle) - Math.abs(b.e.year - middle)
		)[0];
	const ups = moments.filter((x) => UP.includes(x.e.kind));
	const heir = heirOf(best.family, end);
	let picks;
	if (low)
		picks = [
			ups.find((x) => x.e.year < low.e.year - 5),
			low,
			ups.findLast((x) => x.member === heir && x.e.year > low.e.year + 5) ??
				ups.findLast((x) => x.e.year > low.e.year + 5)
		];
	else {
		const [first, last] = [ups[0], ups.at(-1)];
		const mid = ups.find(
			(x) => x.e.year > first.e.year + 5 && x.e.year < last.e.year - 5 && x.m !== first.m
		);
		picks = [first, mid, last];
	}
	picks = picks
		.filter(Boolean)
		.filter((x, k, xs) => xs.findIndex((y) => y.e.year === x.e.year) === k);
	return { ...best, picks };
}

/** The thread's lines: the family is introduced once, and each new generation is named from the last. */
function threadShots(run, { family, f, picks }) {
	return picks.map((x, k) => {
		const { member, e } = x;
		const prev = picks[k - 1];
		const d = prev ? x.m - prev.m : 0;
		const full = `${member.name} ${family.surname}`;
		const who =
			k === 0
				? full
				: d === 0
					? member.name
					: d > 0
						? `${prev.member.name}'s ${RELATION[d] ?? 'descendant'}, ${member.name},`
						: full;
		const war =
			LOW.includes(e.kind) && warHere(run, member, e.year) && !/conflict/.test(e.text)
				? `War comes to ${cellName(cellAt(member, e.year))}. `
				: '';
		const meet =
			k === 0 ? `Meet the ${family.surname} family of ${cellName(family.homeCell)}. ` : '';
		return {
			year: e.year,
			say: `${e.year}: ${meet}${war}${who} ${e.text}.`,
			town: { familyEvent: [f, x.m, x.i], preset: x.scene }
		};
	});
}

/** ", home of the Okafor family" when the event's state rules where the family lived that year. */
function homeOf(run, { family }, e) {
	const member = family.members.findLast((m) => m.born <= e.year) ?? family.members[0];
	const ruler = rulerAt(run, e.year, cellAt(member, e.year));
	return ruler && e.polityIds?.includes(ruler.id) ? `, home of the ${family.surname} family` : null;
}

/** "In 2025, Zainab Lawal works as a teacher in Rivers." The youngest working adult still alive. */
function heirLine({ family }, end) {
	const heir = heirOf(family, end);
	if (!heir) return '';
	const work =
		heir.occupation === 'shop owner'
			? 'runs a shop'
			: `works as ${/^[aeiou]/.test(heir.occupation) ? 'an' : 'a'} ${heir.occupation}`;
	return `In ${end}, ${heir.name} ${family.surname} ${work} in ${cellName(heir.cell)}. `;
}

function addCutaways(run, beats, start, end) {
	const inRange = (year) => year > start && year <= end;
	const thread = familyThread(run, inRange, start, end);
	const firsts = inventionCutaways(run, inRange);
	const communications = (home) =>
		Object.entries(COMMUNICATION_SCENES).flatMap(([techId, preset]) => {
			const event = run.events.findIndex(
				(e) => e.techId === techId && ['adoption', 'invention'].includes(e.kind) && inRange(e.year)
			);
			if (event < 0) return [];
			const e = run.events[event];
			const tag = home ? home(e) : '';
			if (tag == null) return [];
			return [{ year: e.year, say: `${e.year}: ${e.title}${tag}.`, town: { event, preset } }];
		});
	let picked;
	if (thread) {
		// The family carries the Short; at most one other scene: a world first, or the railway or a
		// new medium reaching the family's home.
		const home = (e) => homeOf(run, thread, e);
		const family = threadShots(run, thread);
		const other = [firsts[0], railwayCutaway(run, inRange, home), ...communications(home)].find(
			(shot) => shot && !family.some((p) => p.year === shot.year)
		);
		picked = other ? [...family, other] : family;
		const card = beats.find((b) => b.card);
		if (card) card.say = `${heirLine(thread, end)}${card.say}`;
	} else {
		const railway = railwayCutaway(run, inRange);
		const lead = firsts.find((shot) => shot.year !== railway?.year);
		const everyday = communications(null);
		const offset = (run.inputs.seed >>> 0) % (everyday.length || 1);
		const varied = [...everyday.slice(offset), ...everyday.slice(0, offset)];
		picked = railway ? [railway] : [];
		const limit = picked.length + STORY_SHOTS;
		for (const shot of [lead, ...varied, ...firsts]) {
			if (picked.length === limit) break;
			if (!shot || picked.some((p) => p.year === shot.year || p.town.preset === shot.town.preset))
				continue;
			picked.push(shot);
		}
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

/** With `home`, only when it reaches the family's home, said as such and without the stand-in trader. */
function railwayCutaway(run, inRange, home = null) {
	const event = run.events.findIndex((e) => e.techId === 'railway' && inRange(e.year));
	if (event === -1) return;
	const rail = run.events[event];
	const tag = home ? home(rail) : '';
	if (tag == null) return;
	const ours = defaultData.tech.find((t) => t.id === 'railway')?.nigeriaYear;
	const gap = ours ? ours - rail.year : 0;
	const early =
		gap > 0
			? ` That's ${gap} years before Nigeria's first railway in our world.`
			: gap < 0
				? ` That's ${-gap} years after Nigeria's first railway in our world.`
				: '';
	const picture = home
		? ''
		: ' Picture a trader carrying a sack from the market as the train pulls in.';
	const say = `${rail.year}: ${rail.title}${tag}.${early}${picture}`;
	return { year: rail.year, say, town: { event, preset: 'station' } };
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

function cutawaySource(run, { event, familyEvent }) {
	if (Number.isInteger(event)) return run.events[event];
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
