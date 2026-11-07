// @ts-nocheck
// Shared by sim:export and sim:short: run commands from the repo root, and load a saved run from D1
// together with engine modules (through Vite, because the engine imports JSON the way Vite does).
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { loadRun } from './steps.js';

export const ROOT = resolve(import.meta.dirname, '../..');
const ACCOUNT = 'b63a84699997cca4d0cdcc5c596e04a3';

export const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
export const step = (s) => console.log(`\n▸ ${s}`);

/**
 * @param {{ runId: string, local: boolean }} args
 * @param {string[]} modules more files from src/lib/game/sim to load
 */
export async function loadSaved(args, modules = []) {
	step(`Loading run ${args.runId}`);
	const d1 = JSON.parse(
		sh('pnpm', ['-s', 'wrangler', 'd1', 'execute', 'fantasy-naija', args.local ? '--local' : '--remote', '--json', '--command', `SELECT * FROM sim_runs WHERE id = '${args.runId}'`], {
			env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT }
		})
	);
	const row = d1[0]?.results?.[0];
	const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn', resolve: { alias: { $lib: join(ROOT, 'src/lib') } } });
	try {
		const load = (p) => vite.ssrLoadModule(join(ROOT, 'src/lib/game/sim', p));
		const [{ ENGINE_VERSION, runSimulation }, { unpackOutput }, ...mods] = await Promise.all(['world.js', 'recording.js', ...modules].map(load));
		const run = await loadRun(row, { engineVersion: ENGINE_VERSION, runSimulation, unpackOutput });
		return { run, inputs: JSON.parse(row.inputs), summary: row.summary ? JSON.parse(row.summary) : null, mods };
	} finally {
		await vite.close();
	}
}
