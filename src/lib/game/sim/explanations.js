import { PARAMS as P } from './params.js';
import { powerText } from './format.js';

/**
 * Plain words for recorded factors, chosen by how big the recorded multiplier is.
 * Never recompute an old run using new engine constants. Each entry: label, then [at least, text] from best down.
 * @type {Record<string, [string, [number, string][]]>}
 */
const FACTORS = {
	literacy: ['Reading', [
		[1.5, 'Most people can read, so many can do better-paid work.'],
		[1.1, 'Some people can read, which opens up better-paid work.'],
		[0, 'Few people can read, so most work pays little more than farming.']
	]],
	infrastructure: ['Roads and markets', [
		[2.5, 'Roads, transport and markets are well built, so goods sell easily.'],
		[1.5, 'Some roads and markets, but trade is still hard in places.'],
		[0, 'Few roads or markets, so goods are hard to sell.']
	]],
	electricity: ['Electricity', [
		[1.1, 'Power is reliable enough to run machines and shops.'],
		[1.02, 'Some power, but cuts hold businesses back.'],
		[0, 'Almost no usable power: few connections, or cuts most of the time.']
	]],
	conflict: ['War', [
		[0.995, 'No war damage.'],
		[0, 'War damage is holding work back.']
	]],
	food: ['Food', [
		[0.995, 'There was enough food last year.'],
		[0, 'Food ran short last year, leaving people less able to work.']
	]]
};

/** "+91%", "−20%" or "no effect": how much a factor raises or lowers income. */
export const effectText = (/** @type {number} */ m) => {
	const pct = Math.round((m - 1) * 100);
	return pct === 0 ? 'no effect' : pct > 0 ? `+${pct}%` : `−${-pct}%`;
};

/** @param {{incomeFactors?: Record<string,number>|null, electricityAccess?: number, powerService?: number}} cell */
export function incomeDrivers(cell) {
	return Object.entries(cell.incomeFactors ?? {}).flatMap(([key, multiplier]) => {
		const f = FACTORS[key];
		if (!f || !Number.isFinite(multiplier)) return [];
		const text = (f[1].find(([min]) => multiplier >= min) ?? f[1][f[1].length - 1])[1];
		const power = key === 'electricity' ? powerText(cell.electricityAccess, cell.powerService) : null;
		const description = power ? `${power}. ${text}` : text;
		return [{ key, label: f[0], description, multiplier, effect: effectText(multiplier) }];
	});
}

const POLITICS = new Set(['coup', 'government', 'secession', 'union', 'war', 'peace']);
const TECH = new Set(['invention', 'adoption', 'spread']);
const factorText = {
	literacy: ['More people have been to school here than in most states', 'Fewer people have been to school here than in most states'],
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

	const school = run.inputs?.switches?.freeSchoolingFromYear;
	if (school != null && frame.yearInt >= school && (cell.schoolExpansion ?? 1) < P.schoolPolicyCoverage - 0.01 && (cell.electricityAccess ?? 1) < 0.9)
		lines.push({ kind: 'budget', text: 'Free schools are taking money that would extend the power grid' });

	const share = (cell.netMigration ?? 0) / (cell.pop || 1);
	if (share < -0.003) lines.push({ kind: 'migration', text: 'People are leaving for better-paid states' });
	else if (share > 0.003) lines.push({ kind: 'migration', text: 'Drawing migrants from poorer states' });
	return lines.length ? lines.slice(0, 3) : [{ kind: 'calm', text: 'Much like the rest of the country right now' }];
}
