// @ts-nocheck
// What the HUD shows at a given year: stats beside the real values, captions, family cards, real borders.
import { stateColor } from './colors.js';
import { defaultData } from './data/index.js';
import { frameAt } from './frame.js';
import { populationAt } from './population.js';
import { whyHere } from './explanations.js';
import { powerText, formatStat } from './format.js';

/** Electricity as a scorecard cell: "73% · 24 h a day". */
const powerShort = (access, service) =>
	access > 0.005 && service > 0
		? `${Math.round(access * 100)}% · ${Math.round((24 * service) / access)} h a day`
		: `${Math.round((access ?? 0) * 100)}%`;

/**
 * The well-known country whose income per person is closest (by ratio), in the last data year:
 * { name, relation } with relation 'like', or 'richer'/'poorer' when past the ends of the list.
 */
export function richAs(value, peers = defaultData.national.peers) {
	const list = Object.entries(peers?.gdpPc ?? {});
	if (!Number.isFinite(value) || !list.length) return null;
	const [top, bottom] = [
		list.reduce((a, b) => (b[1] > a[1] ? b : a)),
		list.reduce((a, b) => (b[1] < a[1] ? b : a))
	];
	if (value > top[1] * 1.15) return { name: top[0], relation: 'richer' };
	if (value < bottom[1] / 1.15) return { name: bottom[0], relation: 'poorer' };
	const off = ([, v]) => Math.abs(Math.log(value / v));
	const closest = (xs) => xs.reduce((a, b) => (off(b) < off(a) ? b : a));
	// An African country when one is within 25%; otherwise the closest anywhere.
	const africa = list.filter(([name]) => peers.africa?.includes(name));
	const near =
		africa.length && off(closest(africa)) < Math.log(1.25) ? closest(africa) : closest(list);
	return { name: near[0], relation: 'like' };
}
/** "like China today", "richer than the United States today". */
export const richAsText = (r) =>
	r && `${r.relation === 'like' ? 'like' : `${r.relation} than`} ${r.name} today`;

/** "like Egypt, per person": richAs over electricity made per person (short enough for one line). */
const powerAs = (twh, pop, national = defaultData.national) => {
	const r =
		pop > 0 &&
		richAs((twh * 1e9) / pop, { gdpPc: national.peersKwhPc, africa: national.peers?.africa });
	if (!r) return null;
	const how = { like: 'like', richer: 'more than', poorer: 'less than' }[r.relation];
	return `${how} ${r.name}, per person`;
};

/**
 * "Nigeria" is the name Britain gave the land: use it only while one state of that name holds all of it.
 * Otherwise the run speaks of "the land we call Nigeria".
 */
export const isOneNigeria = (snapshot) =>
	snapshot.polities.length === 1 && snapshot.polities[0].id === 'nigeria';
export const landName = (snapshot) =>
	isOneNigeria(snapshot) ? 'Nigeria' : 'the land we call Nigeria';
/** The end table's title: "Their Nigeria in 2025", or "The land we call Nigeria, in 2025". */
export const endingTitle = (run) => {
	const last = run.history.at(-1);
	return isOneNigeria(last)
		? `Their Nigeria in ${last.year}`
		: `The land we call Nigeria, in ${last.year}`;
};

/** Exports by kind, as each year's totals store them. */
const EXPORTS = {
	exportsOil: 'oil',
	exportsFarm: 'farm',
	exportsGoods: 'factories',
	exportsMinerals: 'minerals',
	exportsPower: 'power'
};
const exportsTotal = (totals) =>
	totals.exportsOil == null ? null : Object.keys(EXPORTS).reduce((s, k) => s + (totals[k] ?? 0), 0);
/** "oil 88% · factories 5% · farm 4%": kinds of at least 1%, biggest first. */
const shareText = (pairs) =>
	pairs
		.filter(([, share]) => share >= 0.01)
		.sort((a, b) => b[1] - a[1])
		.map(([name, share]) => `${name} ${Math.round(share * 100)}%`)
		.join(' · ');
const exportsMix = (totals) => {
	const all = exportsTotal(totals);
	return all
		? shareText(Object.entries(EXPORTS).map(([k, name]) => [name, (totals[k] ?? 0) / all]))
		: null;
};
/** Real electricity made (TWh) in a year with data, else null. */
const oursTwh = (national, year) => {
	const kwh = nationalAt(national, 'electricityKwhPc', year);
	const pop = nationalAt(national, 'pop', year);
	return kwh == null || pop == null ? null : (kwh * pop) / 1e9;
};

const realEvents = defaultData.events.events.filter((e) => e.kind === 'history');
const isRealWar = (e) => e.effects?.war || (e.effects?.conquer && e.effects?.mortality);

const nationalAt = (national, key, year) =>
	national[key]?.[national.years.indexOf(Math.floor(year))] ?? null;

/** @returns {{ key: string, label: string, value: number, ours: number | null }[]} */
export function statsAt(run, national, year) {
	const f = frameAt(run, year);
	const wars = run.events.filter((e) => e.kind === 'war' && e.year <= f.yearInt).length;
	const realWars = realEvents.filter((e) => isRealWar(e) && e.year <= f.yearInt).length;
	return [
		{
			key: 'pop',
			label: 'Population',
			value: f.totals.pop,
			ours: nationalAt(national, 'pop', year)
		},
		{
			key: 'litSchool', // school literacy, as surveys measure it, so it compares with ours
			label: 'Can read (school)',
			value: f.totals.litSchool,
			ours: nationalAt(national, 'litSchool', year)
		},
		// Any script, Quranic Ajami and Arabic included. No national series counts it, so no "ours".
		{ key: 'litAny', label: 'Can read (any script)', value: f.totals.litAny, ours: null },
		{
			key: 'lifeExp',
			label: 'Life expectancy',
			value: f.totals.lifeExp,
			ours: nationalAt(national, 'lifeExp', year)
		},
		{ key: 'wars', label: 'Wars so far', value: wars, ours: realWars },
		...(run.history[0].totals.electricityAccess == null
			? []
			: [
					{
						key: 'electricityAccess',
						label: 'Has electricity',
						value: f.totals.electricityAccess,
						extra:
							!Number.isFinite(f.totals.powerService) || !f.totals.electricityAccess
								? null
								: `about ${Math.round((24 * f.totals.powerService) / f.totals.electricityAccess)} hours a day`,
						// Show observed national totals only in survey years, never label a carried estimate as observed.
						ours:
							defaultData.development.snapshots.find((s) => s.year === Math.floor(year))?.national
								.electricityAccess.value ?? null
					}
				]),
		...(run.history.at(-1).totals.powerTwh == null
			? [] // older recordings
			: [
					{
						key: 'powerTwh',
						label: 'Power made',
						value: f.totals.powerTwh,
						extra: powerAs(f.totals.powerTwh, f.totals.pop),
						ours: oursTwh(national, year)
					},
					{
						key: 'exports',
						label: 'Exports a year',
						value: exportsTotal(f.totals),
						extra: exportsMix(f.totals),
						// Real exports are known only in a few years (exportAnchors): shown then, never carried.
						ours: national.exportAnchors?.[Math.floor(year)]?.total ?? null
					}
				])
	];
}

/** Events in (year − window, year], plus real history that this run skipped. */
export function captionsAt(run, year, windowYears = 1.5) {
	const inWindow = (y) => y > year - windowYears && y <= year;
	const fired = new Set(run.events.map((e) => e.id).filter(Boolean));
	const own = run.events
		.filter((e) => inWindow(e.year) && e.kind !== 'adoption')
		.map((e) => ({ year: e.year, title: e.title, kind: e.kind, polityIds: e.polityIds ?? [] }));
	const skipped = realEvents
		.filter((e) => inWindow(e.year) && !fired.has(e.id) && e.year >= run.history[0].year)
		.map((e) => ({
			year: e.year,
			title: null,
			kind: 'ours',
			polityIds: [],
			ours: `In our world: ${e.title}`
		}));
	return [...own, ...skipped].sort((a, b) => b.year - a.year);
}

/** Up to two family life events from the last three years, newest first. */
/** @param {number | undefined} months */
const savingsText = (months) =>
	months == null
		? null
		: months === 0
			? 'No savings left'
			: `Savings: about ${months} month${months === 1 ? '' : 's'} of income`;

export function familyCardsAt(run, year) {
	const cards = [];
	for (const f of run.families)
		for (const m of f.members)
			for (const e of m.lifeEvents)
				if (e.year <= year && e.year > year - 3)
					cards.push({
						key: `${f.id}:${m.born}:${m.name}:${e.year}:${e.kind}`,
						familyId: f.id,
						surname: f.surname,
						member: m.name,
						text: `${m.name} ${f.surname} ${e.text}.`,
						year: e.year,
						savings: savingsText(f.months?.[e.year - run.history[0].year])
					});
	return cards.sort((a, b) => b.year - a.year).slice(0, 2);
}

/** The real polity map in `year` (latest snapshot at or before it). */
export function realBordersAt(year) {
	const snaps = defaultData.realBorders;
	return (snaps.filter((s) => s.year <= year).at(-1) ?? snaps[0]).polities;
}

const cellName = new Map(defaultData.cells.map((c) => [c.id, c.name]));
const share2006 = (() => {
	const pop = defaultData.regional.pop[2006];
	const total = Object.values(pop).reduce((a, b) => a + b, 0);
	return Object.fromEntries(Object.entries(pop).map(([id, p]) => [id, p / total]));
})();
/** Our latest real figure up to `year`, marked with its year when older than that: "$5,070 (2022)". */
const dated = (key, value, asOf, year) =>
	value == null ? null : asOf < Math.floor(year) ? `${formatStat(key, value)} (${asOf})` : value;
const lastYearOf = (national, key, year) => {
	for (let y = Math.floor(year); y >= national.years[0]; y--)
		if (national[key][national.years.indexOf(y)] != null) return y;
	return null;
};

const lastKnown = (national, key, year) => {
	for (let y = Math.floor(year); y >= national.years[0]; y--) {
		const v = national[key][national.years.indexOf(y)];
		if (v != null) return v;
	}
	return null;
};
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
// Leaves out any faith under half a percent: "75% Muslim · 25% Christian".
const mix = (r) =>
	[
		[r.islam, 'Muslim'],
		[r.christian, 'Christian'],
		[r.traditional, 'traditional']
	]
		.filter(([v]) => v >= 0.005)
		.map(([v, name]) => `${pct(v)} ${name}`)
		.join(' · ');

/** Historical comparison: regional population anchors and national urban averages. */
export function realFrame(year) {
	const polities = realBordersAt(year);
	const owner = new Map(polities.flatMap((p) => p.cellIds.map((id) => [id, p.id])));
	const national = defaultData.national;
	const populations = populationAt(defaultData, Math.floor(year));
	const urban = lastKnown(national, 'urban', year) ?? 0.05;
	return {
		year,
		yearInt: Math.floor(year),
		t: 0,
		polities,
		events: [],
		cells: defaultData.cells.map((c) => ({
			id: c.id,
			polityId: owner.get(c.id),
			// Inside Nigeria, paint today's 36 states and the FCT each their own colour, lines between them.
			color: owner.get(c.id) === 'nigeria' ? stateColor(c.id) : undefined,
			nextPolityId: owner.get(c.id),
			pop: populations[c.id],
			urban,
			warFront: false,
			epidemic: false
		}))
	};
}

/** The final "their Nigeria vs ours" table. */
export function endingRows(run, national, summary) {
	const last = run.history.at(-1);
	const year = last.year;
	const biggest = last.cells.reduce((a, b) => (b.urban * b.pop > a.urban * a.pop ? b : a));
	const theirMix = { islam: 0, christian: 0, traditional: 0 };
	const ourMix = { islam: 0, christian: 0, traditional: 0 };
	for (const c of last.cells)
		for (const k of Object.keys(theirMix)) theirMix[k] += (c.religion[k] * c.pop) / last.totals.pop;
	for (const [id, s] of Object.entries(defaultData.regional.religion[2018]))
		for (const k of Object.keys(ourMix)) ourMix[k] += s[k] * share2006[id];
	const realWars = realEvents.filter((e) => isRealWar(e) && e.year <= year).length;
	const space = run.events.find((e) => e.kind === 'invention' && e.techId === 'crewed-spaceflight');
	const rows = [
		{
			label: 'Population',
			theirs: last.totals.pop,
			ours: lastKnown(national, 'pop', year),
			key: 'pop'
		},
		{
			label: 'Can read (school)',
			theirs: last.totals.litSchool,
			ours: dated(
				'litSchool',
				lastKnown(national, 'litSchool', year),
				lastYearOf(national, 'litSchool', year),
				year
			),
			key: 'litSchool'
		},
		{ label: 'Can read (any script)', theirs: last.totals.litAny, ours: null, key: 'litAny' },
		{
			label: 'Life expectancy',
			theirs: last.totals.lifeExp,
			ours: dated(
				'lifeExp',
				lastKnown(national, 'lifeExp', year),
				lastYearOf(national, 'lifeExp', year),
				year
			),
			key: 'lifeExp'
		},
		{
			label: 'Income per person',
			theirs: last.totals.incomePc,
			ours: dated(
				'incomePc',
				lastKnown(national, 'gdpPc', year),
				lastYearOf(national, 'gdpPc', year),
				year
			),
			oursValue: lastKnown(national, 'gdpPc', year),
			// Which well-known country each is as rich as today.
			like: {
				theirs: richAsText(richAs(last.totals.incomePc)),
				ours: richAsText(richAs(lastKnown(national, 'gdpPc', year)))
			},
			key: 'incomePc'
		},
		{
			label: 'Has electricity',
			theirs: powerShort(last.totals.electricityAccess, last.totals.powerService),
			ours: (() => {
				const s = defaultData.development.snapshots.filter((x) => x.year <= year).at(-1);
				return s
					? dated('electricityAccess', s.national.electricityAccess.value, s.year, year)
					: null;
			})(),
			key: 'electricityAccess'
		},
		...(last.totals.powerTwh == null
			? [] // older recordings
			: [
					(() => {
						const asOf = lastYearOf(national, 'electricityKwhPc', year);
						const ours = asOf == null ? null : oursTwh(national, asOf);
						return {
							label: 'Power made',
							theirs: last.totals.powerTwh,
							ours: dated('powerTwh', ours, asOf, year),
							like: {
								theirs: powerAs(last.totals.powerTwh, last.totals.pop),
								ours: asOf == null ? null : powerAs(ours, nationalAt(national, 'pop', asOf))
							},
							key: 'powerTwh'
						};
					})(),
					(() => {
						const [asOf, real] = Object.entries(national.exportAnchors ?? {})
							.filter(([y]) => +y <= year)
							.at(-1) ?? [null, null];
						return {
							label: 'Exports a year',
							theirs: exportsTotal(last.totals),
							ours: real && dated('exports', real.total, +asOf, year),
							like: {
								theirs: exportsMix(last.totals),
								ours:
									real &&
									shareText([
										['oil', real.oil],
										['farm', real.farm],
										['factories', real.goods],
										['minerals', real.minerals]
									])
							},
							key: 'exports'
						};
					})()
				]),
		{
			label: 'Wars',
			theirs: run.events.filter((e) => e.kind === 'war').length,
			ours: realWars,
			key: 'wars'
		},
		// How many states share the land, and which (ours: one, Nigeria).
		{
			label: 'States',
			theirs: last.polities.length,
			ours: 1,
			like: {
				theirs: last.polities.map((p) => p.name).join(', '),
				ours: 'Federal Republic of Nigeria'
			}
		},
		{ label: 'Biggest city', theirs: cellName.get(biggest.id) ?? biggest.id, ours: 'Lagos' },
		...(space
			? [{ label: 'People in space', theirs: `Since ${space.year}`, ours: 'Not yet' }]
			: []),
		{ label: 'Religious mix', theirs: mix(theirMix), ours: mix(ourMix) }
	];
	if (summary)
		rows.push({
			label: `In ${summary.runs} runs`,
			theirs: `${summary.withWar} had a war · ${
				summary.nigeriaFormed === 0
					? 'Nigeria never formed'
					: summary.nigeriaFormed === summary.runs
						? 'Nigeria formed every time'
						: `Nigeria formed in ${summary.nigeriaFormed}`
			}`,
			ours: '—'
		});
	return rows;
}

/**
 * What the map shows when you point at a state: the polity ruling it in this frame, the state's
 * modern name, the real-history ruler if different, and the whole polity's numbers.
 * @param {import('./types.js').RunResult} run
 * @param {ReturnType<typeof frameAt>} frame
 * @param {string} cellId
 */
export function placeAt(run, frame, cellId) {
	const cell = frame.cells.find((c) => c.id === cellId);
	const polity = cell && frame.polities.find((p) => p.id === cell.polityId);
	if (!polity) return null;
	const cells = frame.cells.filter((c) => polity.cellIds.includes(c.id));
	const pop = cells.reduce((s, c) => s + c.pop, 0);
	const avg = (f) => cells.reduce((s, c) => s + f(c) * c.pop, 0) / (pop || 1);
	const real = realBordersAt(frame.yearInt).find((p) => p.cellIds.includes(cellId))?.name;
	const name = cellName.get(cellId) ?? cellId;
	const names = new Map(frame.polities.map((p) => [p.id, p.name]));
	return {
		cellId,
		polityId: polity.id,
		name: polity.name,
		today: `${name}${cellId === 'fct' ? '' : ' State'} today`,
		ours: real && real !== polity.name ? `In our world: ${real}` : null,
		cellIds: polity.cellIds,
		// This state alone, so a region's reading is not hidden in the whole country's average.
		here: {
			pop: cell.pop,
			litSchool: cell.litSchool,
			litAny: cell.litAny,
			power: powerText(cell.electricityAccess, cell.powerService)
		},
		pop,
		litSchool: avg((c) => c.litSchool),
		litAny: avg((c) => c.litAny),
		incomePc: avg((c) => c.incomePc),
		religion: {
			islam: avg((c) => c.religion.islam),
			christian: avg((c) => c.religion.christian),
			traditional: avg((c) => c.religion.traditional)
		},
		why: whyHere(run, frame, cellId),
		atWarWith: (frame.wars ?? [])
			.filter((pair) => pair.includes(polity.id))
			.map(([p, q]) => names.get(p === polity.id ? q : p) ?? 'a former state')
	};
}
