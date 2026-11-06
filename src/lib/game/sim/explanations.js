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

const POLITICS = new Set(['coup', 'government', 'secession', 'union', 'war', 'peace']);
const TECH = new Set(['invention', 'adoption', 'spread']);
const factorText = {
	literacy: ['More people read here than in most states', 'Fewer people read here than in most states'],
	infrastructure: ['Better roads and markets than most states', 'Poorer roads and markets than most states'],
	electricity: ['More reliable power than most states', 'Less reliable power than most states']
};

/**
 * Up to three plain reasons for what is happening in one state at this moment of playback:
 * hardship and recovery first, then politics, new technology, the strongest income factor, migration.
 * Reads only what the run recorded.
 * @param {any} run @param {{ yearInt: number }} frame @param {string} cellId
 * @returns {{ kind: string, text: string }[]}
 */
export function whyHere(run, frame, cellId) {
	const i = Math.max(0, Math.min(run.history.length - 1, frame.yearInt - run.history[0].year));
	const cell = run.history[i].cells.find((/** @type {any} */ c) => c.id === cellId);
	if (!cell) return [];
	const lines = [];
	const was = (/** @type {number} */ back) =>
		run.history[Math.max(0, i - back)].cells.find((/** @type {any} */ c) => c.id === cellId);
	const hungry = (/** @type {any} */ c) => (c?.foodStress ?? 0) > 0.2;
	if (hungry(cell))
		lines.push({
			kind: 'hardship',
			text: (cell.incomeFactors?.conflict ?? 1) < 0.85 ? 'Fighting is disrupting food supplies' : 'Food is short after a poor harvest'
		});
	else if ([1, 2, 3, 4, 5].some((b) => hungry(was(b))))
		lines.push({ kind: 'recovery', text: 'Recovering from a food crisis' });

	const recent = (/** @type {Set<string>} */ kinds, /** @type {number} */ years) =>
		run.events.findLast(
			(/** @type {any} */ e) =>
				kinds.has(e.kind) &&
				e.year <= frame.yearInt &&
				e.year > frame.yearInt - years &&
				(e.polityIds?.includes(cell.polityId) || e.cellIds?.includes(cellId))
		);
	const politics = recent(POLITICS, 8);
	if (politics) lines.push({ kind: 'politics', text: `${politics.title} (${politics.year})` });
	const tech = recent(TECH, 10);
	if (tech) lines.push({ kind: 'tech', text: `${tech.title} (${tech.year})` });

	// Compared with the country at the same moment, so the reason says why *here* differs.
	const cells = run.history[i].cells;
	const total = cells.reduce((/** @type {number} */ n, /** @type {any} */ c) => n + c.pop, 0) || 1;
	const national = (/** @type {string} */ k) =>
		cells.reduce((/** @type {number} */ n, /** @type {any} */ c) => n + (c.incomeFactors?.[k] ?? 1) * c.pop, 0) / total;
	const [key, ratio] = Object.keys(factorText)
		.map((k) => /** @type {[string, number]} */ ([k, (cell.incomeFactors?.[k] ?? 1) / national(k)]))
		.filter(([, r]) => Number.isFinite(r))
		.sort((x, y) => Math.abs(Math.log(y[1])) - Math.abs(Math.log(x[1])))[0] ?? [];
	if (key && Math.abs(Math.log(ratio)) >= 0.08)
		lines.push({ kind: 'income', text: factorText[/** @type {keyof typeof factorText} */ (key)][ratio >= 1 ? 0 : 1] });

	const share = (cell.netMigration ?? 0) / (cell.pop || 1);
	if (share < -0.003) lines.push({ kind: 'migration', text: 'People are leaving for better-paid states' });
	else if (share > 0.003) lines.push({ kind: 'migration', text: 'Drawing migrants from poorer states' });
	return lines.length ? lines.slice(0, 3) : [{ kind: 'calm', text: 'Much like the rest of the country right now' }];
}
