// @ts-nocheck
// pnpm sim:export <runId> [--local] [--from Y] [--to Y] [--splits Y,Y] [--voice id] [--4k] [--render]
// Turns a saved run into a HyperFrames project in exports/<runId>/ (and an MP4 with --render).
// Owner only, on the Mac: reads D1 through wrangler, voices narration on device with Kokoro.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, createServer } from 'vite';
import { parseArgs, preflight, loadRun, narrationFor } from './steps.js';
import { compositionHtml } from './composition.js';
import { exportConfig } from './vite.config.js';

const ROOT = resolve(import.meta.dirname, '../..');
const ACCOUNT = 'b63a84699997cca4d0cdcc5c596e04a3';
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
const step = (s) => console.log(`\n▸ ${s}`);

const args = parseArgs(process.argv.slice(2));
const venv = join(homedir(), '.cache/hyperframes/kokoro-venv/bin/python');
const python = process.env.HYPERFRAMES_PYTHON ?? (existsSync(venv) ? venv : 'python3');
preflight((cmd, a) => sh(cmd, a, { stdio: 'ignore' }), python);

const out = join(ROOT, 'exports', args.runId);
mkdirSync(join(out, 'audio'), { recursive: true });

step(`Loading run ${args.runId}`);
const d1 = JSON.parse(
	sh('pnpm', ['-s', 'wrangler', 'd1', 'execute', 'fantasy-naija', args.local ? '--local' : '--remote', '--json', '--command', `SELECT * FROM sim_runs WHERE id = '${args.runId}'`], {
		env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT }
	})
);
const row = d1[0]?.results?.[0];

// The engine imports JSON the way Vite does, so load it through Vite.
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn', resolve: { alias: { $lib: join(ROOT, 'src/lib') } } });
const load = (p) => vite.ssrLoadModule(join(ROOT, 'src/lib/game/sim', p));
const [{ ENGINE_VERSION, runSimulation }, { unpackOutput }, narration, { speakable }, { planExport, scenarioCard }] = await Promise.all(
	['world.js', 'recording.js', 'narration.js', 'kitten.js', 'export.js'].map(load)
);
let run;
try {
	run = await loadRun(row, { engineVersion: ENGINE_VERSION, runSimulation, unpackOutput });
} finally {
	await vite.close();
}
const inputs = JSON.parse(row.inputs);
const options = { from: args.from, to: args.to, splits: args.splits };
const range = planExport(run, options); // also checks the years

const card = scenarioCard(inputs);
const summary = row.summary ? JSON.parse(row.summary) : null;

/** Voices `text` on device into audio/<name>.wav; returns its length in seconds. */
function voice(name, text) {
	const txt = join(out, 'audio', `${name}.txt`);
	writeFileSync(txt, speakable(text));
	const said = JSON.parse(
		sh('npx', ['-y', 'hyperframes', 'tts', txt, '--voice', args.voice, '-o', join(out, 'audio', `${name}.wav`), '--json'], {
			env: { ...process.env, HYPERFRAMES_PYTHON: python }
		})
	);
	if (!said.ok) throw new Error(`Voice failed for ${name}: ${said.error?.message}`);
	return said.durationSeconds;
}

step(`Opening card: ${card.label}, ${card.from}–${card.to}`);
const audio = { title: voice('chapter-title', card.spoken) };
const texts = {};
for (const chapter of narration.chaptersFor(run).filter((c) => c.to > range.from && c.from < range.to)) {
	step(`Chapter ${chapter.index + 1} (${chapter.title}): narration and voice`);
	const digest = narration.digestChapter(run, chapter);
	const said = await narrationFor(chapter, digest, { runId: args.runId, site: args.site, fetch, fallbackNarration: narration.fallbackNarration });
	if (!said.ai) console.log('  The AI narration did not come; using the built-in text.');
	texts[chapter.index] = said.text;
	audio[chapter.index] = voice(`chapter-${chapter.index}`, texts[chapter.index]);
}

step('Building the page');
const dataFile = join(out, 'data.json');
writeFileSync(dataFile, JSON.stringify({ run, options, audio, texts, summary, card }));
await build(exportConfig({ dataFile, outDir: out }));
const plan = planExport(run, { ...options, audio, texts, summary });
writeFileSync(join(out, 'index.html'), compositionHtml({ width: args.width, height: args.height, duration: plan.duration, cues: plan.cues }));
console.log(`  ${plan.duration.toFixed(1)} s of video, ${plan.cues.length - 1} narrated chapters`);

step('Checking the composition');
for (const cmd of ['lint', 'check']) {
	try {
		console.log(sh('npx', ['-y', 'hyperframes', cmd, out]));
	} catch (e) {
		console.log(e.stdout ?? '', e.stderr ?? '');
		if (cmd === 'check') throw new Error(`hyperframes ${cmd} found problems (above)`);
	}
}

if (args.render) {
	step('Rendering');
	sh('npx', ['-y', 'hyperframes', 'render', out, '--quality', 'delivery', '--output', join(out, `${args.runId}.mp4`)], { stdio: 'inherit' });
	console.log(`\nDone: exports/${args.runId}/${args.runId}.mp4`);
} else console.log(`\nDone: exports/${args.runId}/ (preview with: npx hyperframes preview exports/${args.runId})`);
