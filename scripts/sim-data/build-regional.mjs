// Builds regional data and copies the hand-authored files into src/lib/game/sim/data/.
import { readFileSync, writeFileSync } from 'node:fs';
import { populationAt } from '../../src/lib/game/sim/population.js';
import { TRADE_SOURCES } from './build-national.mjs';

const CACHE = new URL('./.cache/', import.meta.url);
const AUTH = new URL('./authored/', import.meta.url);
const OUT = new URL('../../src/lib/game/sim/data/', import.meta.url);
const readJson = (u) => JSON.parse(readFileSync(u, 'utf8'));
const write = (name, obj) => writeFileSync(new URL(name, OUT), JSON.stringify(obj) + '\n');

const cells = readJson(new URL('cells.json', OUT));
const national = readJson(new URL('national.json', OUT));
const ids = cells.map((c) => c.id);

// --- population by cell -------------------------------------------------------
// HYDE/ISIMIP spatial reconstructions replace the former 2006-share backcast.
// 2006 remains a census anchor. Modern cells are reporting footprints, not old state borders.
const wikitext = readJson(new URL('states-population.json', CACHE)).parse.wikitext;
const census = {};
for (const row of wikitext.split('|-').slice(1)) {
	const lines = row.split('\n').filter((l) => l.startsWith('|'));
	const name = lines[0]?.match(/\[\[([^|\]]+)/)?.[1];
	if (!name) continue;
	const alias = {
		'Federal Capital Territory (Nigeria)': 'fct',
		'Federal Capital Territory': 'fct',
		'Nasarawa State': 'nassarawa'
	};
	const id =
		alias[name] ??
		name
			.replace(/ State$/, '')
			.toLowerCase()
			.replace(/ /g, '-');
	census[id] = Number(lines[1].replace(/[^\d]/g, ''));
}
const missing = ids.filter((id) => !census[id]);
if (missing.length) throw new Error(`census missing ${missing.join(', ')}`);

const historical = readJson(new URL('./reference/historical-population.json', import.meta.url));
const anchors = { ...historical.snapshots, 1850: historical.snapshots[1861], 2006: census };
const populationData = { cells, national, regional: { pop: anchors } };

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
	pop: Object.fromEntries(
		Object.keys(anchors)
			.map(Number)
			.sort((a, b) => a - b)
			.map((year) => [year, populationAt(populationData, year)])
	),
	populationEvidence: {
		earliestGridYear: 1861,
		proxyYears: { 1850: 1861 },
		method: historical.method,
		caveats: historical.caveats
	},
	religion: { 1850: shares(rel['1850']), 2018: shares(rel['2018']) }
});

// --- real borders: expand snapshots so every one lists every cell exactly once ---
const p1850 = readJson(new URL('polities-1850.json', AUTH));
const borders = readJson(new URL('real-borders.json', AUTH));
let current = p1850.polities.map((p) => ({
	id: p.id,
	name: p.name,
	cellIds: [...p.cellIds],
	british: false
}));
const snapshots = [{ year: 1850, polities: structuredClone(current) }];
for (const snap of borders.snapshots) {
	const incoming = (snap.replace ?? snap.polities).map((p) => ({
		...p,
		cellIds: p.cellIds === 'all' ? [...ids] : p.cellIds
	}));
	const taken = new Set(incoming.flatMap((p) => p.cellIds));
	const kept = snap.polities ? [] : current.filter((p) => !incoming.some((n) => n.id === p.id));
	current = [
		...kept.map((p) => ({ ...p, cellIds: p.cellIds.filter((c) => !taken.has(c)) })),
		...incoming
	].filter((p) => p.cellIds.length);
	snapshots.push({
		year: snap.year,
		...(snap.atWar && { atWar: true }),
		polities: structuredClone(current)
	});
}
write('real-borders.json', snapshots);

// --- copies of authored files ------------------------------------------------------
write('polities-1850.json', p1850.polities);
const events = readJson(new URL('events.json', AUTH));
write('events.json', { flags: events.flags, groups: events.groups, events: events.events });
write('tech.json', readJson(new URL('tech.json', AUTH)).tech);
write(
	'nbs.json',
	(({ literacy2010, nlss2019 }) => ({ literacy2010, nlss2019 }))(
		readJson(new URL('nbs.json', AUTH))
	)
);
const names = readJson(new URL('names.json', AUTH));
write('names.json', { languages: names.languages, cellLanguage: names.cellLanguage });

// --- attribution ---------------------------------------------------------------
const manifest = readJson(new URL('manifest.json', CACHE));
const sources = [
	...historical.sources,
	...readJson(new URL('development.json', OUT)).sources,
	...readJson(new URL('dhs-wealth.json', OUT)).sources,
	...Object.entries(manifest).map(([file, m]) => ({
		name: m.name,
		url: m.url,
		licence: m.licence,
		files: [file]
	})),
	...['polities-1850', 'real-borders', 'events', 'tech', 'names', 'religion', 'nbs'].flatMap((f) =>
		readJson(new URL(`${f}.json`, AUTH)).sources.map((s) => ({ ...s, files: [`${f}.json`] }))
	),
	...readJson(new URL('minerals.json', OUT)).sources.map((s) => ({
		...s,
		files: ['minerals.json']
	})),
	...TRADE_SOURCES
];
write('sources.json', sources);
console.log(`regional data: ${snapshots.length} border snapshots, ${sources.length} sources`);
