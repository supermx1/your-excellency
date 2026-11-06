/**
 * Interpolate regional shares (not absolute counts), then apportion a known national total.
 * Largest remainders keep integer cell populations and the national total exactly consistent.
 * @param {{cells:{id:string}[], regional?:{pop:Record<string,Record<string,number>>}, national:{years:number[],pop:(number|null)[]}}} data
 * @param {number} year
 * @returns {Record<string, number>}
 */
export function populationAt(data, year) {
	if (!data.regional?.pop) return {};
	const years = Object.keys(data.regional.pop)
		.map(Number)
		.sort((a, b) => a - b);
	if (!years.length) throw new Error('Missing population anchors');
	const lo = years.findLast((y) => y <= year) ?? years[0];
	const hi = years.find((y) => y >= year) ?? years[years.length - 1];
	const a = data.regional.pop[lo];
	const b = data.regional.pop[hi];
	/** @param {Record<string,number>} table */
	const sum = (table) => Object.values(table).reduce((s, n) => s + n, 0);
	const totalA = sum(a),
		totalB = sum(b);
	const national = data.national.pop[data.national.years.indexOf(year)];
	if (national == null) throw new Error('Missing national population');
	const total = Math.round(national);
	if (!(totalA > 0 && totalB > 0 && total > 0)) throw new Error('Missing population anchors');
	const t = lo === hi ? 0 : (year - lo) / (hi - lo);
	const rows = data.cells.map((c) => {
		const value = ((a[c.id] / totalA) * (1 - t) + (b[c.id] / totalB) * t) * total;
		if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid population for ${c.id}`);
		return { id: c.id, count: Math.floor(value), remainder: value % 1 };
	});
	const left = total - rows.reduce((s, row) => s + row.count, 0);
	rows.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));
	for (let i = 0; i < left; i++) rows[i].count++;
	return Object.fromEntries(rows.map((r) => [r.id, r.count]));
}
