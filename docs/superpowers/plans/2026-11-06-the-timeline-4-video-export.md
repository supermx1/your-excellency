# The Timeline 4: Video Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm sim:export <runId>` turns a saved run into a HyperFrames project on the owner's Mac and, with `--render`, an MP4 with an on-device voice.

**Architecture:** A Node script loads the run (D1 via `wrangler`), gets each chapter's narration from the live site's cached narration endpoint, voices it with `npx hyperframes tts` (Kokoro), and measures each clip with `ffprobe`. A pure function `planExport` maps video time to playback time, stretching chapters to fit their narration and holding on split-screen years. A Vite-built page draws every frame with the live site's own `Diorama.js`, HUD and family cards, driven only by HyperFrames' `hf-seek` time.

**Tech Stack:** Node 24+, Vite (`build`, `createServer().ssrLoadModule`), Svelte 5 (`mount`, `flushSync`), Three.js via the existing `Diorama.js`, HyperFrames CLI (`npx hyperframes tts | lint | check | snapshot | render`), `ffprobe`, `wrangler d1 execute`.

**Spec:** `docs/superpowers/specs/2026-11-05-the-timeline-simulation-design.md`, sections *Export (owner only, on the Mac)*, *Visuals → One renderer for live and export*, *Addendum → Export-ready*. Read the HyperFrames skills `hyperframes-core` (composition contract) and `hyperframes-animation/adapters/three.md` before Task 4.

## Global Constraints

- Owner only, run on the Mac. Nothing is added to the deployed site.
- Voice: `npx hyperframes tts` (Kokoro, on device; Python 3.10+ with `pip install kokoro-onnx soundfile`). No Workers AI allocation is spent on voice. Default voice `am_michael`; `--voice` overrides.
- Narration audio lengths set the timing of captions and scenes.
- Output: 16:9 MP4, 1920×1080; `--4k` gives 3840×2160.
- The owner picks the years (`--from`, `--to`) and the split-screen moments (`--splits`, default every key year in range).
- One renderer: frames come from `src/lib/components/sim/diorama/Diorama.js` and the same pure functions the live view uses (`frameAt`, `cameraAt`, `shotsFor`, `introCamera`, `outroCamera`, `statsAt`, `captionsAt`, `familyCardsAt`, `realFrame`, `endingRows`). No second drawing code.
- Determinism: render state comes only from HyperFrames time. No `Date.now`, `performance.now`, `Math.random`, `requestAnimationFrame` or network during render. Three.js is bundled, not loaded from a CDN. Pixel ratio pinned to 1.
- No new npm dependencies. Output goes to `exports/<runId>/` (gitignored).
- Fonts: generic families only (`ui-sans-serif, system-ui, sans-serif`; `ui-serif, serif`), so `hyperframes lint` raises no `font_family_without_font_face`.

## Review Focus

1. A run saved with an older engine that was never featured has no recording, and re-running it with today's engine would not match what viewers saw. The script must stop with a clear message, not export a different history (Task 5 test).
2. A chapter whose narration is longer than its years' playback: the chapter stretches so the next chapter's audio never overlaps it (Task 2 test).
3. Kokoro or `ffprobe` missing: fail before any synthesis or build, naming the install command (Task 5 test).
4. `--from`/`--to` outside the run, or reversed: clamp to the run's years; reversed throws (Task 2 test).
5. The narration endpoint returns `null` or is unreachable (daily budget spent, offline): use `fallbackNarration(digest).text`, never silence (Task 5 test).

---

### Task 1: Render code fit for video

**Files:**
- Modify: `src/lib/components/sim/diorama/Diorama.js:20-23`
- Test: `src/lib/game/sim/export.test.js` (new)

**Interfaces:**
- Produces: `new Diorama(canvas, { lowDetail?: boolean, pixelRatio?: number })`. `pixelRatio` defaults to today's value (`lowDetail ? 1 : min(devicePixelRatio, 2)`).

- [ ] **Step 1: Write the failing tests** in `export.test.js`:
  - `render modules read no clock, randomness or animation frame`: for each of `components/sim/diorama/{Diorama,globe,geometry,neighbours}.js` and `game/sim/{frame,camera,intro,hud,colors}.js`, read the file and expect no match for `/Date\.now|performance\.now|Math\.random|requestAnimationFrame/`.
  - `Diorama accepts a fixed pixel ratio`: read `Diorama.js` source and expect `/pixelRatio/` in the constructor options (the class needs WebGL, so this is a source check).
- [ ] **Step 2: Run** `pnpm vitest run src/lib/game/sim/export.test.js`. Expected: the pixel-ratio test fails.
- [ ] **Step 3: Implement** the `pixelRatio` option in the `Diorama` constructor.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): Diorama takes a fixed pixel ratio for video`.

### Task 2: Video time ↔ playback time

**Files:**
- Create: `src/lib/game/sim/export-timing.js`
- Test: `src/lib/game/sim/export.test.js`

**Interfaces:**
- Consumes: `buildTimeline(run)` (`timeAt`, `duration`, `keyYears`), `chaptersFor(run)`, `INTRO`, `OUTRO`.
- Produces:
  ```js
  /** @returns {{ duration: number,
   *   cues: { chapter: number, start: number, seconds: number }[],
   *   at(videoTime: number): { play: number, year: number, phase: 'intro'|'run'|'split'|'outro'|'ending' } }} */
  export function planExport(run, { from, to, splits, audio, splitSeconds = 4, gap = 0.8, endingSeconds = 8 })
  // audio: { [chapterIndex]: seconds }; splits: number[] (years)
  ```

Order of the video: intro (`0..INTRO`, playback `0..INTRO`), then each chapter overlapping `[from, to]` clipped to that range, then outro (`OUTRO` s, playback past `timeline.duration`), then the ending card (`endingSeconds`). A chapter's moving time is `max(timeAt(end) − timeAt(start), audio + gap − its split holds)`, stretched linearly; each split year inside it adds a `splitSeconds` hold where playback stays at `timeAt(year)`. After the intro the first frame shows `from`.

- [ ] **Step 1: Write the failing tests:**
  - `intro maps straight through, then the run starts at from`: `at(0).play === 0`, `at(INTRO).phase === 'intro'`, `at(INTRO + 0.01).year` within 0.1 of `from`.
  - `narration never runs into the next chapter`: with `audio[0] = 60` on a chapter whose playback is 5 s, `cues[0].start + cues[0].seconds + gap <= cues[1].start`.
  - `a chapter with no narration keeps its own pace`: `audio` missing for a chapter gives that chapter its playback length.
  - `a split year holds`: for a split year `y`, some 4-second window has `phase === 'split'` and constant `play === timeAt(y)`.
  - `stays inside the chosen years`: for 200 evenly spaced video times in the `run` phase, `from <= year <= to`.
  - `clamps and refuses`: `from` before the run starts uses the start; `to` after it uses the end; `from > to` throws `RangeError`.
  - `ends on the ending card`: `at(duration).phase === 'ending'`, and `duration` equals the sum of all parts.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/game/sim/export.test.js`. Expected: FAIL, `planExport` not defined.
- [ ] **Step 3: Implement** `planExport` as a list of segments `{ v0, v1, p0, p1, phase }` with a binary search in `at()`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): export timing fits chapters to their narration`.

### Task 3: What each video frame shows

**Files:**
- Create: `src/lib/game/sim/export-scene.js`
- Test: `src/lib/game/sim/export.test.js`

**Interfaces:**
- Consumes: `planExport(...).at`, `shotsFor`, `cameraAt`, `introCamera`, `outroCamera`, `frameAt`, `realFrame`, `statsAt`, `captionsAt`, `familyCardsAt`, `endingRows`, `defaultData.national`.
- Produces: `sceneAt(run, plan, shots, time) → { camera, frame, real: frame | null, stats, caption, families, ending: rows | null, year }`. `real` only in the `split` phase; `ending` only in the `ending` phase.

- [ ] **Step 1: Write the failing tests:** `sceneAt` at time 0 has `camera` deep-equal to `introCamera(0)`; in a `split` window `real` is non-null and `frame.year === real.year`; at `plan.duration` `ending` equals `endingRows(run, defaultData.national, null)`; in the `run` phase `camera` equals `cameraAt(shots, at(time).play)`.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** `sceneAt` (outro camera = `outroCamera(play − timeline.duration)`).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): export scene per video frame`.

### Task 4: The composition page

**Files:**
- Create: `scripts/sim-export/page/main.js`, `scripts/sim-export/page/ExportEnding.svelte`, `scripts/sim-export/page/page.css`, `scripts/sim-export/composition.js`, `scripts/sim-export/vite.config.js`
- Test: `scripts/sim-export/composition.test.js`

**Interfaces:**
- Consumes: `sceneAt`, `planExport`, `Diorama`, `Hud.svelte` (`{ year, stats, caption, label }`), `FamilyCard.svelte` (`{ card }`).
- Produces:
  - `compositionHtml({ width, height, duration, cues }) → string`: standalone root `<div id="root" data-composition-id="timeline-export" data-width data-height data-duration>` (no `<template>`), `<canvas id="hf-map">`, `<canvas id="hf-real">`, `<div id="hf-hud">`, one `<audio id="narr-<chapter>" src="audio/chapter-<chapter>.wav" data-start data-duration data-volume="1">` per cue, `<link rel="stylesheet" href="page.css">`, `<script type="module" src="page.js">`.
  - `page.js` reads `./data.json` (bundled at build: `{ run, options, audio }`), builds the plan, and registers `window.__hf.buildReady['timeline']`. `renderAt(time)`: `sceneAt` → `diorama.draw(frame, camera)`; split → `#hf-map` and `#hf-real` side by side, the real one drawn with `WIDE`; HUD and family cards updated through Svelte props, then `flushSync()`. Listens for `hf-seek` and renders `window.__hfThreeTime || 0` once.
  - `vite.config.js`: input `page/main.js`, output `page.js` + `page.css` into the `outDir` the caller passes, `$lib` → `src/lib`, plugins `svelte()` from `@sveltejs/vite-plugin-svelte` (already a dev dependency) and `tailwindcss()` from `@tailwindcss/vite`.

- [ ] **Step 1: Write the failing tests** for `compositionHtml`: root carries the three `data-` sizes and `data-duration`; no `<template`; no `crossorigin`; every cue has an `<audio>` with an `id`, its `data-start` and `data-duration`; `--4k` sizes appear when passed.
- [ ] **Step 2: Run** `pnpm vitest run scripts/sim-export/composition.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `compositionHtml`, then `main.js`, `ExportEnding.svelte` (the `endingRows` table, light text on the dark background) and `page.css` (`@import 'tailwindcss'; @source '../../../src/lib/components/sim';` plus an `@theme` that sets `--font-sans` and `--font-serif` to the generic stacks in Global Constraints). Run the Svelte autofixer on `ExportEnding.svelte` until clean.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): HyperFrames composition page for exports`.

### Task 5: `pnpm sim:export`

**Files:**
- Create: `scripts/sim-export/export.mjs`, `scripts/sim-export/steps.js`
- Modify: `package.json` (script `"sim:export": "node scripts/sim-export/export.mjs"`), `.gitignore` (`/exports`)
- Test: `scripts/sim-export/steps.test.js`

**Interfaces:**
- Produces, in `steps.js` (side effects injected so tests need no network or binaries):
  - `parseArgs(argv) → { runId, from?, to?, splits?, voice: 'am_michael', width: 1920, height: 1080, render: boolean, site: 'https://yx.techgfxlimited.com' }`. Throws on a run id not matching `/^[0-9a-zA-Z]{10}$/`. `--4k` sets 3840×2160.
  - `preflight(exec) → void`: throws naming `pip install kokoro-onnx soundfile` if `npx hyperframes tts --list` fails, and `brew install ffmpeg` if `ffprobe -version` fails.
  - `loadRun(row, { engineVersion, runSimulation, unpackOutput }) → RunResult`: `row.output` → unpack; else same engine → `runSimulation(row.inputs)`; else throws `Error` whose message says to feature the run on the engine it was saved with.
  - `narrationFor(chapter, digest, { runId, site, fetch, fallbackNarration }) → string`: POST `site/api/sim/narrate` `{ runId, chapterIndex, digest }`; returns `narration.text`, or `fallbackNarration(digest).text` on `null`, a non-200 or a thrown fetch.
- `export.mjs` wires them: `parseArgs` → `preflight` → `wrangler d1 execute fantasy-naija --remote --json --command "SELECT * FROM sim_runs WHERE id = '<runId>'"` (id already validated) → engine modules through Vite `createServer({ server: { middlewareMode: true }, appType: 'custom' }).ssrLoadModule(...)` (the engine's JSON imports need Vite) → `loadRun` → chapters in range → `narrationFor` → `speakable(text)` (from `kitten.js`) into `exports/<id>/audio/chapter-<n>.txt` → `npx hyperframes tts <txt> --voice <voice> -o chapter-<n>.wav` → `ffprobe -show_entries format=duration` → write `data.json` → Vite `build` with `scripts/sim-export/vite.config.js` → write `index.html` from `compositionHtml` → `npx hyperframes lint` and `check` → with `--render`: `npx hyperframes render --quality delivery --output exports/<id>/<id>.mp4`.

- [ ] **Step 1: Write the failing tests:** `parseArgs` (default voice and size, `--4k`, `--from 1960 --to 2025`, `--splits 1914,1967`, bad id throws); `preflight` (each missing tool throws its install line; both present passes); `loadRun` (output wins; same engine re-runs; older engine without output throws a message containing `feature`); `narrationFor` (API text used; `null`, 500 and a thrown fetch all give the fallback text).
- [ ] **Step 2: Run** `pnpm vitest run scripts/sim-export/steps.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `steps.js`, then `export.mjs`, the `package.json` script and `.gitignore` line.
- [ ] **Step 4: Run** the tests, `pnpm check` and `pnpm vitest run`. Expected: PASS, 0 errors.
- [ ] **Step 5: Commit** `feat(sim): pnpm sim:export builds a HyperFrames project for a saved run`.

### Task 6: One short featured run, rendered with voice

**Files:** none new; fixes go where the failure is.

- [ ] **Step 1:** Make a 2015–2025 history run on the live site, save it and feature it at `/admin/sim`.
- [ ] **Step 2: Run** `pnpm sim:export <id>`. Expected: `npx hyperframes check` reports 0 findings.
- [ ] **Step 3: Run** `npx hyperframes snapshot --at 1,5,<first split + 1>,<duration − 2>` in `exports/<id>/` and look at each frame: globe, diorama with HUD, split screen, ending card.
- [ ] **Step 4: Run** `pnpm sim:export <id> --render`. Then `ffprobe -v error -show_entries format=duration:stream=codec_type -of json exports/<id>/<id>.mp4`. Expected: duration within 0.1 s of the root `data-duration`; one video and one audio stream.
- [ ] **Step 5:** Watch the MP4 once from start to end: voice matches its chapter, no clipped or overlapping narration, split screens hold, the ending reads.
- [ ] **Step 6: Commit** any fixes, then merge and deploy as usual (the site itself is unchanged by this plan).
