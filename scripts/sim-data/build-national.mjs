// Builds src/lib/game/sim/data/national.json: Nigeria's real series aligned to years 1850–2100.
// Gaps between real points are interpolated linearly; nothing is extrapolated (null outside the data),
// except population, which uses the long-run series before 1950 and UN projections after the last estimate.
import { readFileSync, writeFileSync } from 'node:fs';

const CACHE = new URL('./.cache/', import.meta.url);
const OUT = new URL('../../src/lib/game/sim/data/national.json', import.meta.url);
const FIRST = 1850;
const LAST = 2100;
export const YEARS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);

/** Reads an OWID CSV and returns Map<year, number> for Nigeria from the given column. */
export function owidSeries(csv, column) {
	const [header, ...rows] = csv.trim().split('\n');
	const cols = header.split(',');
	const ci = cols.indexOf(column);
	if (ci < 0) throw new Error(`column ${column} not in ${cols.join(',')}`);
	const out = new Map();
	for (const row of rows) {
		const f = row.split(',');
		if (f[1] !== 'NGA' || f[ci] === '') continue;
		out.set(Number(f[2]), Number(f[ci]));
	}
	return out;
}

/** Linear interpolation inside the known range; null outside it. */
export function align(series, scale = 1) {
	const known = [...series.keys()].sort((a, b) => a - b);
	return YEARS.map((y) => {
		if (series.has(y)) return round(series.get(y) * scale);
		const lo = known.findLast((k) => k < y);
		const hi = known.find((k) => k > y);
		if (lo === undefined || hi === undefined) return null;
		const t = (y - lo) / (hi - lo);
		return round((series.get(lo) * (1 - t) + series.get(hi) * t) * scale);
	});
}

const round = (n) => Math.round(n * 1000) / 1000;
const read = (f) => readFileSync(new URL(f, CACHE), 'utf8');

if (import.meta.url === `file://${process.argv[1]}`) {
	const popLong = owidSeries(read('pop-long.csv'), 'population_historical');
	const unEst = owidSeries(read('pop-un.csv'), 'population__sex_all__age_all__variant_estimates');
	const unProj = owidSeries(read('pop-un.csv'), 'population__sex_all__age_all__variant_medium__projected');
	const pop = new Map([...popLong, ...unEst, ...unProj]);

	const national = {
		years: YEARS,
		pop: align(pop),
		lifeExp: align(owidSeries(read('life-expectancy.csv'), 'life_expectancy_0')),
		litSchool: align(owidSeries(read('literacy.csv'), 'literacy_rate'), 0.01),
		urban: align(owidSeries(read('urban.csv'), 'share__area_type_urban__data_type_estimates'), 0.01),
		gdpPc: align(owidSeries(read('gdp-pc.csv'), 'gdp_per_capita')),
		electricityKwhPc: align(owidSeries(read('electricity.csv'), 'per_capita_total_generation__kwh')),
		oilTwh: align(owidSeries(read('oil.csv'), 'oil_production_twh'))
	};
	writeFileSync(OUT, JSON.stringify(national) + '\n');
	console.log('national.json:', Object.keys(national).join(', '));
}
