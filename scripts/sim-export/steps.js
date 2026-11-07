// @ts-nocheck
// The export's steps that decide things. Side effects (commands, fetch, the engine) are passed in, so
// tests need no network, binaries or database.

const DEFAULTS = { voice: 'am_michael', width: 1920, height: 1080, render: false, local: false, site: 'https://yx.techgfxlimited.com' };

/** `pnpm sim:export <runId> [--local] [--from 1960] [--to 2025] [--splits 1914,1967] [--voice am_michael] [--4k] [--render]` */
export function parseArgs(argv) {
	const out = { ...DEFAULTS };
	const rest = [...argv];
	while (rest.length) {
		const a = rest.shift();
		if (a === '--4k') Object.assign(out, { width: 3840, height: 2160 });
		else if (a === '--render') out.render = true;
		else if (a === '--local') out.local = true; // read the dev server's database, for testing
		else if (a === '--from' || a === '--to') out[a.slice(2)] = Number(rest.shift());
		else if (a === '--splits') out.splits = rest.shift().split(',').filter(Boolean).map(Number);
		else if (a === '--voice') out.voice = rest.shift();
		else if (a === '--site') out.site = rest.shift();
		else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
		else out.runId = a;
	}
	if (!/^[0-9a-zA-Z]{10}$/.test(out.runId ?? '')) throw new Error('Give a saved run id (10 letters and digits), e.g. pnpm sim:export Ab12Cd34Ef');
	for (const k of ['from', 'to']) if (k in out && !Number.isInteger(out[k])) throw new Error(`--${k} needs a year`);
	if (out.splits?.some((y) => !Number.isInteger(y))) throw new Error('--splits needs years, e.g. 1914,1967');
	return out;
}

/** Fails before any work if the voice cannot run. @param {(cmd: string, args: string[]) => void} exec throws on failure */
export function preflight(exec, python) {
	try {
		exec(python, ['-c', 'import kokoro_onnx, soundfile']);
	} catch {
		throw new Error(
			`The voice needs Kokoro. Run: python3 -m venv ~/.cache/hyperframes/kokoro-venv && ~/.cache/hyperframes/kokoro-venv/bin/pip install kokoro-onnx soundfile`
		);
	}
}

/**
 * A saved run as viewers saw it: its recording if featured, else a re-run on the same engine.
 * An older engine without a recording would give a different history, so stop instead.
 */
export async function loadRun(row, { engineVersion, runSimulation, unpackOutput }) {
	if (!row) throw new Error('No saved run with that id.');
	if (row.output) return unpackOutput(row.output);
	if (row.engine_version === engineVersion) return runSimulation(JSON.parse(row.inputs));
	throw new Error(
		`Run was saved on engine ${row.engine_version} (now ${engineVersion}) and has no recording. Re-running it would show a different history: feature it at /admin/sim on the engine it was saved with, or export a newer run.`
	);
}

/**
 * The site's narration for a chapter (owner edits and the AI cache come first there). The AI sometimes
 * times out, so it is asked up to `tries` times; then the built-in text. Returns { text, ai }.
 */
export async function narrationFor(chapter, digest, { runId, site, fetch, fallbackNarration, tries = 3 }) {
	for (let i = 0; i < tries; i++) {
		try {
			const res = await fetch(`${site}/api/sim/narrate`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ runId, chapterIndex: chapter.index, digest })
			});
			if (res.ok) {
				const text = (await res.json())?.narration?.text;
				if (text) return { text, ai: true };
			}
		} catch {
			// offline or the site is down: try again, then fall through
		}
	}
	return { text: fallbackNarration(digest).text, ai: false };
}
