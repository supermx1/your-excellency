// @ts-nocheck
// What the HUD shows at a given year: stats beside the real values, captions, family cards, real borders.
import { defaultData } from './data/index.js';
import { frameAt } from './frame.js';
import { populationAt } from './population.js';
import { whyHere } from './explanations.js';

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
						label: 'Electricity access',
						value: f.totals.electricityAccess,
						// Show observed national totals only in survey years, never label a carried estimate as observed.
						ours:
							defaultData.development.snapshots.find((s) => s.year === Math.floor(year))?.national
								.electricityAccess.value ?? null
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
	months == null ? null : months === 0 ? 'No savings left' : `Savings: about ${months} month${months === 1 ? '' : 's'} of income`;

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
const lastKnown = (national, key, year) => {
	for (let y = Math.floor(year); y >= national.years[0]; y--) {
		const v = national[key][national.years.indexOf(y)];
		if (v != null) return v;
	}
	return null;
};
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const mix = (r) =>
	`${pct(r.islam)} Muslim · ${pct(r.christian)} Christian · ${pct(r.traditional)} traditional`;

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
			ours: lastKnown(national, 'litSchool', year),
			key: 'litSchool'
		},
		{ label: 'Can read (any script)', theirs: last.totals.litAny, ours: null, key: 'litAny' },
		{
			label: 'Life expectancy',
			theirs: last.totals.lifeExp,
			ours: lastKnown(national, 'lifeExp', year),
			key: 'lifeExp'
		},
		{
			label: 'Wars',
			theirs: run.events.filter((e) => e.kind === 'war').length,
			ours: realWars,
			key: 'wars'
		},
		{ label: 'Biggest city', theirs: cellName.get(biggest.id) ?? biggest.id, ours: 'Lagos' },
		{ label: 'Religious mix', theirs: mix(theirMix), ours: mix(ourMix) }
	];
	if (summary)
		rows.push({
			label: `In ${summary.runs} runs`,
			theirs: `${summary.withWar} had a war · ${summary.nigeriaFormed} formed a Nigeria`,
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
		here: { pop: cell.pop, litSchool: cell.litSchool, litAny: cell.litAny },
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
