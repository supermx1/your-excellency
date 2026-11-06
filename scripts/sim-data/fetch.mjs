// Downloads raw sources for The Timeline into scripts/sim-data/.cache/ (skips files already there).
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { SURVEYS, surveyUrl } from './build-development.mjs';

const CACHE = new URL('./.cache/', import.meta.url);
const owid = (slug, query = '') =>
	`https://ourworldindata.org/grapher/${slug}.csv?v=1&csvType=full&useColumnShortNames=true${query}`;

export const SOURCES = [
	...SURVEYS.map((year) => ({
		file: `dhs-development-${year}.json`,
		url: surveyUrl(year),
		name: `NPC / ICF — Nigeria DHS ${year} state development indicators`,
		licence: 'DHS API terms of use; acknowledge NPC, ICF and The DHS Program'
	})),
	{
		file: 'pop-long.csv',
		url: owid('population'),
		name: 'Our World in Data — Population (HYDE, Gapminder, UN WPP)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'pop-un.csv',
		url: owid('population-with-un-projections'),
		name: 'Our World in Data — UN World Population Prospects 2024',
		licence: 'CC BY 4.0'
	},
	{
		file: 'life-expectancy.csv',
		url: owid('life-expectancy'),
		name: 'Our World in Data — Life expectancy (UN WPP, Riley)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'literacy.csv',
		url: owid('cross-country-literacy-rates'),
		name: 'Our World in Data — Literacy (UNESCO, van Zanden et al.)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'urban.csv',
		url: owid('share-of-population-urban'),
		name: 'Our World in Data — Urban share (UN WUP)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'gdp-pc.csv',
		url: owid('gdp-per-capita-maddison-project-database'),
		name: 'Maddison Project Database 2023 via Our World in Data',
		licence: 'CC BY 4.0'
	},
	{
		file: 'electricity.csv',
		url: owid('electricity-mix', '&frequency=annual&metric=per_capita&source=total'),
		name: 'Our World in Data — Electricity per capita (Ember, Energy Institute)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'oil.csv',
		url: owid('fossil-fuels', '&fuel=oil&metric=production&per_capita=total'),
		name: 'Our World in Data — Oil production (Energy Institute)',
		licence: 'CC BY 4.0'
	},
	{
		file: 'states-population.json',
		url: 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_Nigerian_states_by_population&prop=wikitext&format=json&formatversion=2',
		name: 'Wikipedia — List of Nigerian states by population (2006 census)',
		licence: 'CC BY-SA 4.0'
	},
	{
		file: 'ne-110m-countries.geojson',
		url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson',
		name: 'Natural Earth — Admin 0 countries 1:110m',
		licence: 'Public domain'
	},
	{
		file: 'ne-50m-countries.geojson',
		url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson',
		name: 'Natural Earth — Admin 0 countries 1:50m',
		licence: 'Public domain'
	},
	{
		file: 'ne-50m-rivers.geojson',
		url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson',
		name: 'Natural Earth — Rivers and lake centerlines 1:50m',
		licence: 'Public domain'
	},
	{
		file: 'ne-50m-lakes.geojson',
		url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_lakes.geojson',
		name: 'Natural Earth — Lakes 1:50m',
		licence: 'Public domain'
	}
];

if (import.meta.url === `file://${process.argv[1]}`) {
	mkdirSync(CACHE, { recursive: true });
	const manifestUrl = new URL('manifest.json', CACHE);
	const manifest = existsSync(manifestUrl) ? JSON.parse(readFileSync(manifestUrl, 'utf8')) : {};
	for (const s of SOURCES) {
		const target = new URL(s.file, CACHE);
		if (existsSync(target)) continue;
		const res = await fetch(s.url, { headers: { 'user-agent': 'the-timeline-data-script/1.0' } });
		if (!res.ok) throw new Error(`${s.file}: HTTP ${res.status} from ${s.url}`);
		writeFileSync(target, await res.text());
		manifest[s.file] = {
			url: s.url,
			name: s.name,
			licence: s.licence,
			fetched: new Date().toISOString()
		};
		console.log(`fetched ${s.file}`);
	}
	writeFileSync(manifestUrl, JSON.stringify(manifest, null, '\t'));
}
