// Builds regional data and copies the hand-authored files into src/lib/game/sim/data/.
import { readFileSync, writeFileSync } from 'node:fs';

const CACHE = new URL('./.cache/', import.meta.url);
const AUTH = new URL('./authored/', import.meta.url);
const OUT = new URL('../../src/lib/game/sim/data/', import.meta.url);
const readJson = (u) => JSON.parse(readFileSync(u, 'utf8'));
const write = (name, obj) => writeFileSync(new URL(name, OUT), JSON.stringify(obj) + '\n');

const cells = readJson(new URL('cells.json', OUT));
const national = readJson(new URL('national.json', OUT));
const ids = cells.map((c) => c.id);
const natPop = (y) => national.pop[national.years.indexOf(y)];

// --- population by cell -------------------------------------------------------
// 2006 census shares (Wikipedia table). Before 1951 three cells were far smaller
// relative to the rest: Lagos and Port Harcourt (Rivers) grew in the 20th century,
// and the FCT area was rural until 1976.
// ponytail: share back-casting instead of HYDE grids; swap in HYDE 3.3 if regional history matters more.
const wikitext = readJson(new URL('states-population.json', CACHE)).parse.wikitext;
const census = {};
for (const row of wikitext.split('|-').slice(1)) {
	const lines = row.split('\n').filter((l) => l.startsWith('|'));
	const name = lines[0]?.match(/\[\[([^|\]]+)/)?.[1];
	if (!name) continue;
	const alias = { 'Federal Capital Territory (Nigeria)': 'fct', 'Federal Capital Territory': 'fct', 'Nasarawa State': 'nassarawa' };
	const id = alias[name] ?? name.replace(/ State$/, '').toLowerCase().replace(/ /g, '-');
	census[id] = Number(lines[1].replace(/[^\d]/g, ''));
}
const missing = ids.filter((id) => !census[id]);
if (missing.length) throw new Error(`census missing ${missing.join(', ')}`);

const PAST = { lagos: 0.25, fct: 0.3, rivers: 0.6 };
function popByCell(year) {
	const weight = Object.fromEntries(ids.map((id) => [id, census[id] * (year <= 1950 ? (PAST[id] ?? 1) : 1)]));
	const total = Object.values(weight).reduce((a, b) => a + b, 0);
	return Object.fromEntries(ids.map((id) => [id, Math.round((weight[id] / total) * natPop(year))]));
}

// --- religion -------------------------------------------------------------------
const rel = readJson(new URL('religion.json', AUTH));
const shares = (table) =>
	Object.fromEntries(
		ids.map((id) => {
			const [i, c, t] = table[id];
			const s = i + c + t;
			return [id, { islam: i / s, christian: c / s, traditional: t / s }];
		})
	);

write('regional.json', {
	pop: Object.fromEntries([1850, 1900, 1950, 2000, 2006].map((y) => [y, popByCell(y)])),
	religion: { 1850: shares(rel['1850']), 2018: shares(rel['2018']) }
});

// --- real borders: expand snapshots so every one lists every cell exactly once ---
const p1850 = readJson(new URL('polities-1850.json', AUTH));
const borders = readJson(new URL('real-borders.json', AUTH));
let current = p1850.polities.map((p) => ({ id: p.id, name: p.name, cellIds: [...p.cellIds], british: false }));
const snapshots = [{ year: 1850, polities: structuredClone(current) }];
for (const snap of borders.snapshots) {
	const incoming = (snap.replace ?? snap.polities).map((p) => ({
		...p,
		cellIds: p.cellIds === 'all' ? [...ids] : p.cellIds
	}));
	const taken = new Set(incoming.flatMap((p) => p.cellIds));
	const kept = snap.polities ? [] : current.filter((p) => !incoming.some((n) => n.id === p.id));
	current = [...kept.map((p) => ({ ...p, cellIds: p.cellIds.filter((c) => !taken.has(c)) })), ...incoming].filter(
		(p) => p.cellIds.length
	);
	snapshots.push({ year: snap.year, polities: structuredClone(current) });
}
write('real-borders.json', snapshots);

// --- copies of authored files ------------------------------------------------------
write('polities-1850.json', p1850.polities);
const events = readJson(new URL('events.json', AUTH));
write('events.json', { flags: events.flags, groups: events.groups, events: events.events });
write('tech.json', readJson(new URL('tech.json', AUTH)).tech);
const names = readJson(new URL('names.json', AUTH));
write('names.json', { languages: names.languages, cellLanguage: names.cellLanguage });

// --- attribution ---------------------------------------------------------------
const manifest = readJson(new URL('manifest.json', CACHE));
const sources = [
	...Object.entries(manifest).map(([file, m]) => ({ name: m.name, url: m.url, licence: m.licence, files: [file] })),
	...['polities-1850', 'real-borders', 'events', 'tech', 'names', 'religion'].flatMap((f) =>
		readJson(new URL(`${f}.json`, AUTH)).sources.map((s) => ({ ...s, files: [`${f}.json`] }))
	)
];
write('sources.json', sources);
console.log(`regional data: ${snapshots.length} border snapshots, ${sources.length} sources`);
