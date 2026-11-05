// @ts-nocheck
// What the HUD shows at a given year: stats beside the real values, captions, family cards, real borders.
import { defaultData } from './data/index.js';
import { frameAt } from './frame.js';

const realEvents = defaultData.events.events.filter((e) => e.kind === 'history');
const isRealWar = (e) => e.effects?.war || (e.effects?.conquer && e.effects?.mortality);

const nationalAt = (national, key, year) => national[key]?.[national.years.indexOf(Math.floor(year))] ?? null;

/** @returns {{ key: string, label: string, value: number, ours: number | null }[]} */
export function statsAt(run, national, year) {
	const f = frameAt(run, year);
	const wars = run.events.filter((e) => e.kind === 'war' && e.year <= f.yearInt).length;
	const realWars = realEvents.filter((e) => isRealWar(e) && e.year <= f.yearInt).length;
	return [
		{ key: 'pop', label: 'Population', value: f.totals.pop, ours: nationalAt(national, 'pop', year) },
		{ key: 'litAny', label: 'Can read', value: f.totals.litAny, ours: nationalAt(national, 'litSchool', year) },
		{ key: 'lifeExp', label: 'Life expectancy', value: f.totals.lifeExp, ours: nationalAt(national, 'lifeExp', year) },
		{ key: 'wars', label: 'Wars so far', value: wars, ours: realWars }
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
		.map((e) => ({ year: e.year, title: null, kind: 'ours', polityIds: [], ours: `In our world: ${e.title}` }));
	return [...own, ...skipped].sort((a, b) => b.year - a.year);
}

/** Up to two family life events from the last three years, newest first. */
export function familyCardsAt(run, year) {
	const cards = [];
	for (const f of run.families)
		for (const m of f.members)
			for (const e of m.lifeEvents)
				if (e.year <= year && e.year > year - 3)
					cards.push({ familyId: f.id, surname: f.surname, member: m.name, text: `${m.name} ${f.surname} ${e.text}.`, year: e.year });
	return cards.sort((a, b) => b.year - a.year).slice(0, 2);
}

/** The real polity map in `year` (latest snapshot at or before it). */
export function realBordersAt(year) {
	const snaps = defaultData.realBorders;
	return (snaps.filter((s) => s.year <= year).at(-1) ?? snaps[0]).polities;
}
