/** Labels interpret recorded factors; never recompute an old run using new engine constants. */
const FACTORS = {
	literacy: ['Literacy', 'Reading skills raise productive capacity in the model.'],
	infrastructure: [
		'Infrastructure',
		'Transport and infrastructure support production and market access.'
	],
	electricity: ['Usable electricity', 'Connected access helps when it provides usable service.'],
	conflict: ['Conflict disruption', 'War damage reduces productive capacity.'],
	food: ['Recent food pressure', 'Food pressure reduces the following year’s productive capacity.']
};

/** @param {{incomeFactors?: Record<string,number>|null}} cell */
export function incomeDrivers(cell) {
	return Object.entries(cell.incomeFactors ?? {}).flatMap(([key, multiplier]) => {
		const labels = FACTORS[/** @type {keyof typeof FACTORS} */ (key)];
		return labels && Number.isFinite(multiplier)
			? [{ key, label: labels[0], description: labels[1], multiplier }]
			: [];
	});
}
