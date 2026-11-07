// @ts-nocheck
// pnpm sim:short <runId> [--local] [--fresh-script] [--voice-ref voice/reference.wav] [--render]
// A vertical (4:5) map clip of a saved run, narrated in the owner's cloned voice, for him to play and
// react to in Cap. First run drafts exports/<id>-short/script.json; edit it and run again: only
// changed lines are voiced again.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { build } from 'vite';
import { parseArgs } from './steps.js';
import { compositionHtml } from './composition.js';
import { exportConfig } from './vite.config.js';
import { ROOT, sh, step, loadSaved } from './load.mjs';

const W = 1080;
const H = 1350;
const args = parseArgs(process.argv.slice(2));
const python = process.env.CHATTERBOX_PYTHON ?? join(homedir(), '.cache/chatterbox-venv/bin/python');
const ref = resolve(ROOT, args.voiceRef ?? 'voice/reference.wav');
if (!existsSync(python))
	throw new Error(`The cloned voice needs Chatterbox. Run: uv venv --python 3.11 ~/.cache/chatterbox-venv && uv pip install --python ~/.cache/chatterbox-venv/bin/python chatterbox-tts "setuptools<81"`);
if (!existsSync(ref)) throw new Error(`No voice reference at ${ref}: give a 10–15 s clip of your natural speech with --voice-ref.`);

const out = join(ROOT, 'exports', `${args.runId}-short`);
mkdirSync(join(out, 'audio'), { recursive: true });
const { run, inputs, summary, mods } = await loadSaved(args, ['short.js', 'kitten.js', 'narration.js']);
const [{ shortScript, planShort }, { speakable }, { scenarioLabel }] = mods;

const scriptFile = join(out, 'script.json');
if (args.freshScript || !existsSync(scriptFile)) {
	writeFileSync(scriptFile, JSON.stringify({ beats: shortScript(run, inputs, summary) }, null, '\t') + '\n');
	console.log(`  Drafted the script: edit exports/${basename(out)}/script.json and run again to change it.`);
}
const { beats } = JSON.parse(readFileSync(scriptFile, 'utf8'));

step(`Voicing ${beats.length} lines in your voice (about a minute a line; unchanged lines are kept)`);
const refHash = createHash('sha1').update(readFileSync(ref)).digest('hex');
const lines = beats.map((b) => {
	const text = speakable(b.say);
	return { text, out: join(out, 'audio', `line-${createHash('sha1').update(refHash + text).digest('hex').slice(0, 12)}.wav`) };
});
const linesFile = join(out, 'lines.json');
writeFileSync(linesFile, JSON.stringify(lines));
const printed = sh(python, [join(ROOT, 'scripts/sim-export/clone.py'), linesFile, ref], { stdio: ['ignore', 'pipe', 'inherit'] });
const seconds = JSON.parse(printed.trim().split('\n').at(-1));
const voices = lines.map((l) => ({ file: `audio/${basename(l.out)}`, seconds: seconds[l.out] }));

step('Building the clip');
const dataFile = join(out, 'data.json');
writeFileSync(dataFile, JSON.stringify({ run, beats, voices, summary, label: scenarioLabel(inputs) }));
await build(exportConfig({ dataFile, outDir: out, entry: 'short' }));
const plan = planShort(run, beats, voices);
writeFileSync(join(out, 'index.html'), compositionHtml({ width: W, height: H, duration: plan.duration, cues: plan.cues }));
console.log(`  ${plan.duration.toFixed(1)} s, ${beats.length} lines`);

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
	sh('npx', ['-y', 'hyperframes', 'render', out, '--quality', 'delivery', '--output', join(out, `${args.runId}-short.mp4`)], { stdio: 'inherit' });
	console.log(`\nDone: exports/${basename(out)}/${args.runId}-short.mp4`);
} else console.log(`\nDone: exports/${basename(out)}/ (preview with: npx hyperframes preview exports/${basename(out)})`);
