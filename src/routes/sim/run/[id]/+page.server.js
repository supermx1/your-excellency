// @ts-nocheck
import { error } from '@sveltejs/kit';
import { getRun } from '$lib/server/sim-runs.js';
import { ENGINE_VERSION } from '$lib/game/sim/world.js';
import { scenarioLabel } from '$lib/game/sim/narration.js';

export async function load({ params, platform }) {
	const db = platform?.env?.DB;
	if (!db) error(503, 'Saved runs are unavailable right now.');
	const run = await getRun(db, params.id);
	if (!run) error(404, "This run doesn't exist (or was deleted).");
	return {
		id: run.id,
		inputs: run.inputs,
		title: run.title ?? `${scenarioLabel(run.inputs)}, from ${run.inputs.startYear}`,
		featured: run.featured,
		output: run.output,
		olderEngine: run.engineVersion !== ENGINE_VERSION
	};
}
