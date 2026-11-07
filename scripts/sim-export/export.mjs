// @ts-nocheck
// pnpm sim:export <runId> [--local] [--from Y] [--to Y] [--splits Y,Y] [--voice id] [--4k] [--render]
// Turns a saved run into a HyperFrames project in exports/<runId>/ (and an MP4 with --render).
// Owner only, on the Mac: reads D1 through wrangler, voices narration on device with Kokoro.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { parseArgs, preflight, narrationFor } from './steps.js';
import { compositionHtml } from './composition.js';
import { exportConfig } from './vite.config.js';
import { ROOT, sh, step, loadSaved } from './load.mjs';

const args = parseArgs(process.argv.slice(2));
const venv = join(homedir(), '.cache/hyperframes/kokoro-venv/bin/python');
const python = process.env.HYPERFRAMES_PYTHON ?? (existsSync(venv) ? venv : 'python3');
preflight((cmd, a) => sh(cmd, a, { stdio: 'ignore' }), python);

const out = join(ROOT, 'exports', args.runId);
mkdirSync(join(out, 'audio'), { recursive: true });

const { run, inputs, summary, mods } = await loadSaved(args, ['narration.js', 'kitten.js', 'export.js']);
const [narration, { speakable }, { planExport, scenarioCard }] = mods;
const options = { from: args.from, to: args.to, splits: args.splits };
const range = planExport(run, options); // also checks the years

const card = scenarioCard(inputs);

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
