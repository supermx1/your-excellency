# The Timeline — Plan 2: Hub, Pages, Diorama and Live Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable "The Timeline" game on the hub: pick a scenario, adjust switches, press Run, and watch Nigeria diverge in a 3D diorama with captions, real-vs-run stats, family cards, Two Nigerias split screens and an ending comparison — smooth enough for the owner to screen-record.

**Architecture:** The engine from Plan 1 runs in a Web Worker and returns a full run. Everything shown is a pure function of `(run, time)`: a **timeline** maps seconds to a fractional year (fast through quiet years, slow at events), and the **frame** at a time is derived from the run's yearly snapshots. A Three.js **Diorama** class draws a frame; Svelte pages own controls and HUD. Because drawing depends only on `(run, time)`, Plan 4's export can drive the same renderer from video frame time.

**Tech Stack:** SvelteKit (Svelte 5 runes), Tailwind v4 (existing neo-brutalist classes), Three.js 0.174 (`SVGLoader`, `ExtrudeGeometry`), Web Workers, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-the-timeline-simulation-design.md`
**Builds on:** Plan 1 (`src/lib/game/sim/`: `runSimulation`, `SWITCHES`, `PRESETS`, `validateSwitches`, `defaultSwitches`, `worker.js` `handleMessage`/`summarize`, `data/index.js` `defaultData`).

**Later plans:** 3 — narration (Workers AI, budget guard, fallback text), D1 runs table, share links `/sim/run/[id]`, featured runs, admin editing. 4 — HyperFrames export.

## Global Constraints

- Hub card title exactly **"The Timeline"**; route **`/sim`** (setup) and **`/sim/play`** (live view).
- Visual direction: **3D diorama** main view; **Two Nigerias** split screen at key years and the ending. Neo-brutalist shell elsewhere (thick black borders, hard shadows, `bg-amber-100` pages) matching `src/routes/+page.svelte`.
- The "ours" side shows **real recorded data** (`defaultData.national`, `defaultData.realBorders`), never a simulated baseline.
- Every drawn frame is a pure function of `(run, timeSeconds, cameraShots)`; no `Date.now()`/`Math.random()` in renderer or HUD code.
- No new runtime dependencies (Three.js already installed). Svelte code goes through the Svelte MCP autofixer until clean, per `CLAUDE.md`.
- Registration: reuse `RegisterGate` exactly as `/city` does (gate on first Run if `localStorage['your-excellency-registered'] !== '1'`).
- Narration in this plan is **built-in template text only** (event titles); AI narration is Plan 3.
- Phones: everything works at 375px wide; the diorama switches to a low-detail mode (no shadows, fewer segments, pixel ratio 1) when `matchMedia('(max-width: 767px)')` matches.
- Start year 1850–2025; end year 2025, or up to 2100 if "Continue to 2100" is ticked.

## Review Focus

1. Tab hidden / phone locked mid-playback → on return the timeline continues from where it was, not jumping years. Test in Task 3 (clock uses accumulated delta capped per frame).
2. Scrubbing to a year before the first snapshot or after the last → clamps, no crash or blank map. Test in Task 3.
3. A run where a polity has a brand-new id every few years (secessions) → colours stay stable per id and remain distinguishable. Test in Task 4.
4. A malformed or hand-edited `?s=` query on `/sim/play` → friendly error with a link back to setup, not a white screen. Test in Task 2.
5. Worker failure (exception in the engine) → error message on the page instead of a spinner forever. Test in Task 2.

---

## File Structure

```
src/lib/game/sim/
  inputs.js          encodeInputs / decodeInputs (URL), validateInputs (years + switches)
  client.js          startRun(): Worker wrapper with error handling
  timeline.js        buildTimeline(run): seconds <-> fractional year, key years
  frame.js           frameAt(run, year): interpolated cell/polity state + active events
  hud.js             statsAt, captionsAt, familyCardsAt, realBordersAt
  colors.js          polityColor(id)
  camera.js          shotsFor(run, timeline), cameraAt(shots, t)
  *.test.js
src/lib/components/sim/
  diorama/Diorama.js       Three.js class: build(cells), draw(frame, camera), resize, dispose
  diorama/geometry.js      SVG path -> extruded meshes per cell (pure-ish, cached)
  DioramaCanvas.svelte     mounts Diorama, ResizeObserver, low-detail switch
  SwitchMenu.svelte        grouped switches from SWITCHES
  Hud.svelte               year counter, stats with "ours", captions
  FamilyCard.svelte
  TwoNigerias.svelte       split screen (real left, run right)
  Ending.svelte            final comparison + 50-run summary
  PlaybackBar.svelte       play/pause, speed, scrub, camera follow toggle
src/routes/sim/+page.svelte        setup
src/routes/sim/play/+page.svelte   live view
src/routes/+page.svelte            hub: third card
tests (Playwright): src/routes/sim/sim.e2e.js
```

---

### Task 1: Engine polish carried over from Plan 1

**Files:**
- Modify: `src/lib/game/sim/switches.js`, `world.js`, `worker.js`, `rules/polities.js`, `rules/events.js`
- Create: `src/lib/game/sim/inputs.js`
- Test: `src/lib/game/sim/inputs.test.js`, extend `switches.test.js`

**Interfaces:**
- Produces: `validateInputs(raw) -> { ok: true, inputs: RunInputs } | { ok: false, error }` (seed: finite integer, coerced from numeric string; startYear integer 1850–2025; endYear integer, startYear < endYear ≤ 2100; switches via `validateSwitches`). `encodeInputs(inputs) -> string` (base64url of JSON), `decodeInputs(str) -> same result type as validateInputs`.
- `handleMessage` wraps work in try/catch and posts `{ type: 'error', message }`.

- [ ] **Step 1: Failing tests:** `validateInputs rejects startYear 1849, 2026 and endYear <= startYear`; `coerces seed "42" to 42 and rejects "abc"`; `encode/decode round-trips`; `decodeInputs('%%%') returns ok:false` (Review Focus 4); `handleMessage posts an error message when runSimulation throws` (pass inputs with startYear 1700 bypassing validation); `each scheduled coup logs exactly one event` (no `coup` + history duplicate for the same year); `no coup events for British-ruled polities` (20 baseline seeds); `genius preset start year is 1850`.
- [ ] **Step 2:** `pnpm vitest run src/lib/game/sim` → the new tests FAIL.
- [ ] **Step 3: Implement.** Scheduled history coups call `coup(world, ng, { log: false })` (history event is the record); emergent coups skip polities with `british: true`. `PRESETS.genius.startYear = 1850` (Ruling: the 1960 start produced only two early inventions; 1850 gives the video's long divergence — the player can still change it).
- [ ] **Step 4:** Run → PASS (all Plan 1 tests still green, calibration included).
- [ ] **Step 5: Commit** `fix(sim): input validation, worker errors, coup logging; genius starts 1850`.

### Task 2: Hub card, setup page and run client

**Files:**
- Modify: `src/routes/+page.svelte` (third card; grid `md:grid-cols-3`; hero copy "Three games, one satire.")
- Create: `src/routes/sim/+page.svelte`, `src/lib/components/sim/SwitchMenu.svelte`, `src/lib/game/sim/client.js`
- Test: `src/lib/game/sim/client.test.js`, `src/routes/sim/sim.e2e.js`

**Interfaces:**
- Consumes: `PRESETS`, `SWITCHES`, `defaultSwitches`, `encodeInputs`, `validateInputs` (Task 1).
- Produces: `startRun(inputs, { extraSeeds = 0, workerFactory? }) -> { result: Promise<RunResult>, summary: Promise<Summary|null>, cancel() }` — rejects `result` with an `Error(message)` on `{type:'error'}` or worker `onerror` (Review Focus 5). `workerFactory` defaults to `() => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` (injected in tests).
- Setup page: two scenario cards (from `PRESETS`) and "Blank"; selecting one fills `SwitchMenu`; start year input; "Continue to 2100" checkbox; Run (behind `RegisterGate` exactly as on `/city`) → `goto('/sim/play?s=' + encodeInputs({ seed: random int, switches, startYear, endYear }))`. Seed generated with `crypto.getRandomValues`.
- Hub card copy: label "Game three", title "The Timeline", text "What if Nigeria was never colonized? What if everyone had a 200 IQ? Flip history's switches and watch a different Nigeria unfold.", button "Rewrite history →" (`bg-amber-300`).

- [ ] **Step 1: Failing tests:** client: `resolves result then summary with a fake worker`; `rejects result on an error message`; `rejects on worker onerror`. e2e: `hub shows The Timeline card linking to /sim`; `choosing Never colonized and Run reaches /sim/play` (register gate: set localStorage in `page.addInitScript`).
- [ ] **Step 2:** Run vitest and `pnpm test:e2e -- sim` → FAIL.
- [ ] **Step 3: Implement** the client, `SwitchMenu.svelte` (one fieldset per `group`; bool → checkbox, enum → segmented radio, number → range with value, year → number input with "as history" empty state), the setup page and the hub card. Run the Svelte autofixer on each `.svelte` file until clean.
- [ ] **Step 4:** Run → PASS; `pnpm check` clean.
- [ ] **Step 5: Commit** `feat(sim): hub card, setup page and worker client`.

### Task 3: Timeline and frames

**Files:**
- Create: `src/lib/game/sim/timeline.js`, `src/lib/game/sim/frame.js`
- Test: `src/lib/game/sim/timeline.test.js`

**Interfaces:**
- Produces:
  - `buildTimeline(run, { quietSecondsPerYear = 0.35, eventSecondsPerYear = 2.5 } = {}) -> { duration, yearAt(t) -> number (fractional), timeAt(year) -> number, keyYears: number[] }`. A year is an "event year" if the run has any event of kind `war`, `peace`, `secession`, `union`, `coup`, `invention`, `history` in it, or a family member is born/dies/learns to read in it. `keyYears` = the run's start year, 1914, 1960, 1967, 2025 (those inside the run) plus each year with a secession, union or invention more than 10 years ahead of real.
  - `frameAt(run, year) -> { year, yearInt, t (0–1 within year), cells: [{ id, polityId, pop, urban, litAny, lifeExp, religion, tension, warFront: boolean }], polities, totals, events: SimEvent[] (events with event.year === yearInt) }` — numeric fields linearly interpolated between `history[i]` and `history[i+1]`; `polityId` and polities taken from the earlier snapshot, plus `nextPolityId` from the later one (so a changing border can fade); `epidemic: boolean` true for cells hit by a `world` event with a `mortality` effect in `yearInt`; year clamped to the run's range (Review Focus 2).
  - `createClock()` → `{ tick(deltaSeconds) -> t, set(t), playing, speed }` with delta capped at 0.25 s per tick (Review Focus 1).

- [ ] **Step 1: Failing tests:** `timeAt(yearAt(t)) ≈ t`; `event years take longer than quiet years`; `yearAt(-5) === startYear` and `yearAt(duration + 99) === endYear`; `frameAt interpolates pop halfway between two years`; `frameAt clamps 1700 to the first snapshot`; `nextPolityId differs from polityId for a cell that changes hands`; `clock ignores a 30-second delta (caps at 0.25)`; `keyYears of a baseline run include 1914, 1960 and 1967`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Timeline: per-year durations array + prefix sums; `yearAt` by binary search. `warFront`: cell belongs to a polity at war and borders the enemy (reuse `borders()` logic from `rules/conflict.js` on the snapshot's polities).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): timeline and frame interpolation`.

### Task 4: Colours, HUD data and camera shots

**Files:**
- Create: `src/lib/game/sim/colors.js`, `src/lib/game/sim/hud.js`, `src/lib/game/sim/camera.js`
- Test: `src/lib/game/sim/hud.test.js`

**Interfaces:**
- Produces:
  - `polityColor(id) -> '#rrggbb'`: fixed colours for the 1850 polity ids (match the brainstorm mockup palette: sokoto `#c9a227`, borno `#8a5a2b`, ibadan `#2f7d5b`, egba-ijebu `#3f8f6a`, lagos `#5fa37f`, ondo `#2a6b4c`, benin `#b5432f`, igala `#7a6bb0`, igbo `#3a6ea5`, rivers-states `#2a9d8f`, calabar `#228277`, middle-belt `#6b8f3a`, british `#9aa4ad`, nigeria `#1f7a3d`); others from `hashString(id)` into HSL with lightness 45–60% and hue spaced away from the nearest neighbours' hues by golden-angle stepping (Review Focus 3).
  - `statsAt(run, national, year) -> [{ key:'pop'|'litAny'|'lifeExp'|'wars', label, value, ours }]` — `ours` from `national` (null when unknown, shown as "—"); `wars` = count of war events up to `year` vs real count from `defaultData.events` history wars (civil war = 1).
  - `captionsAt(run, year, windowYears = 1.5) -> [{ year, title, kind, polityIds, ours? }]` — run events in `(year − windowYears, year]`, plus for history events that did **not** fire in this run but fired in real history in that window: `{ ours: "In our world: <title>" }`.
  - `familyCardsAt(run, year) -> [{ familyId, surname, member, text, year }]` — life events from the last 3 years, newest first, max 2.
  - `realBordersAt(year) -> polities[]` from `defaultData.realBorders` (latest snapshot ≤ year).
  - `shotsFor(run, timeline) -> [{ t, target:[x,y] (cell centroid), zoom }]` — a wide shot by default; a shot on the first front cell of each war start, each secession, each invention's capital; `cameraAt(shots, t) -> { target, zoom }` eased between shots (smoothstep over 1.5 s).

- [ ] **Step 1: Failing tests:** `polityColor is stable for the same id`; `two secession ids made in the same year get colours at least 30° apart in hue`; `statsAt 1950 shows real population from national.json`; `captionsAt for a never-colonized run in 1914 includes "In our world: North and South are amalgamated into Nigeria"`; `familyCardsAt returns at most 2 cards`; `realBordersAt(1920) is one nigeria polity`; `cameraAt returns the wide shot before the first event`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): colours, HUD data and camera shots`.

### Task 5: The 3D diorama

**Files:**
- Create: `src/lib/components/sim/diorama/geometry.js`, `src/lib/components/sim/diorama/Diorama.js`, `src/lib/components/sim/DioramaCanvas.svelte`
- Test: `src/lib/components/sim/diorama/geometry.test.js`; browser verification

**Interfaces:**
- Consumes: `frameAt` output, `polityColor`, `cameraAt`, `@svg-maps/nigeria` paths, `cells.json` centroids.
- Produces:
  - `cellShapes() -> Map<cellId, THREE.Shape[]>` (via `SVGLoader.createShapes` on each state path; Y flipped; centred on the map centre; scale so the map is 20 world units wide) — memoised.
  - `class Diorama { constructor(canvas, { lowDetail }); draw(frame, camera:{target,zoom}); resize(w, h); dispose() }`. One extruded mesh per cell (depth 0.25); material colour = `polityColor(cell.polityId)`; polity borders = `LineSegments` of edges between cells with different polities, rebuilt only when ownership changes; city towers: one cylinder per cell at its centroid, height `0.2 + 4 × urban × pop / 20e6`, emissive gold; changing ownership: cell colour lerps from `polityColor(polityId)` to `polityColor(nextPolityId)` across `frame.t`; epidemics: `epidemic` cells take a sickly green tint fading over the year, so plagues visibly sweep across the map; war front: cells with `warFront` pulse red via emissive intensity `0.4 + 0.4 × sin(2π × frame.t × 2)`; camera: perspective, tilted 52°, looking at `target` with distance `22 / zoom`. No animation loop inside the class — the page calls `draw` each frame.
  - `DioramaCanvas.svelte` props `{ frame, camera, lowDetail }`; draws in an `$effect` when they change; ResizeObserver; disposes on unmount.

- [ ] **Step 1: Failing test:** `cellShapes has 37 entries, each with at least one shape`; `the map spans about 20 units wide`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; autofix `DioramaCanvas.svelte`.
- [ ] **Step 4:** Run test → PASS. Browser: create `src/routes/sim/play/+page.svelte` as a stub that runs a baseline run (seed 1) and mounts `DioramaCanvas` at 1900; `preview_start` the dev server, confirm no console errors and screenshot. Task 6 replaces the stub.
- [ ] **Step 5: Commit** `feat(sim): 3D diorama renderer`.

### Task 6: Live view page

**Files:**
- Create: `src/routes/sim/play/+page.svelte`, `src/lib/components/sim/Hud.svelte`, `FamilyCard.svelte`, `PlaybackBar.svelte`
- Test: extend `src/routes/sim/sim.e2e.js`; browser verification

**Interfaces:**
- Consumes: `decodeInputs`, `startRun` (extraSeeds 50), `buildTimeline`, `createClock`, `frameAt`, `statsAt`, `captionsAt`, `familyCardsAt`, `shotsFor`, `cameraAt`, `DioramaCanvas`.
- Page state: `loading` → `playing` → `ended`; errors render a card "This run couldn't load: <message>" + link to `/sim` (Review Focus 4, 5). One `requestAnimationFrame` loop drives `clock.tick(delta)`; everything else is `$derived` from `t`.
- HUD layout (desktop): diorama full-bleed; year counter top-right (`font-black`, 64px, tabular numbers); stats grid below it, each `value` with `ours: …` underneath; caption bar bottom-left (latest caption, `ours` line dimmed); family card bottom-right. Phone: year + 2 stats top, caption bottom, family card hidden behind a "Families" button.
- Controls (`PlaybackBar`): play/pause (space key), speed ×0.5/×1/×2/×4, scrub slider over years with key-year ticks, "Follow events" camera toggle (off = wide shot), "Two Nigerias" toggle.

- [ ] **Step 1: Failing e2e:** `/sim/play with a never-colonized query shows a year counter that advances past 1851 within 5 s`; `space pauses`; `scrubbing to 1960 shows 1960`; `/sim/play?s=garbage shows the error card with a link to /sim`.
- [ ] **Step 2:** `pnpm test:e2e -- sim` → FAIL.
- [ ] **Step 3: Implement**; autofix every `.svelte` file.
- [ ] **Step 4:** e2e PASS. Browser verification: start the dev server, open a never-colonized and a 200 IQ run, check console has no errors, screenshot at a war and at a key year; repeat at 375×812.
- [ ] **Step 5: Commit** `feat(sim): live view with HUD, families and playback controls`.

### Task 7: Two Nigerias and the ending

**Files:**
- Create: `src/lib/components/sim/TwoNigerias.svelte`, `src/lib/components/sim/Ending.svelte`
- Modify: `src/routes/sim/play/+page.svelte`
- Test: extend `hud.test.js`, `sim.e2e.js`

**Interfaces:**
- Consumes: `realBordersAt`, `statsAt`, `frameAt`, `polityColor`, summary from `startRun`.
- Produces:
  - `TwoNigerias.svelte` props `{ run, year }`: two `DioramaCanvas` side by side (stacked on phones), left labelled "OUR WORLD" with a frame built from `realBordersAt(year)` and real national numbers, right "THEIR WORLD"; the year in a box between them; under each, 4 stats and that year's headline caption.
  - Auto-show: during playback, at each `keyYears` entry the page pauses the clock for 4 s of real time and shows Two Nigerias (skippable with a "Continue" button); the "Two Nigerias" toggle shows it on demand.
  - `endingRows(run, national, summary) -> [{ label, theirs, ours }]` in `hud.js`: population, can read (litAny vs real literacy), life expectancy, wars, biggest city (cell with highest urban × pop, by cell name), religious mix (shares of the three, 2025), and when `summary` exists a line "In N of 50 runs …" for wars and for Nigeria forming.
  - `Ending.svelte`: Two Nigerias final split for the last year + the rows table + buttons "Run again" (same switches, new seed) and "Change switches" (back to `/sim` with the switches pre-filled).

- [ ] **Step 1: Failing tests:** `endingRows includes the six rows and a 50-run line when a summary is given`; e2e: `reaching the end of a short run (startYear 2015) shows the ending table with "Run again"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; autofix.
- [ ] **Step 4:** Tests PASS; browser check of the split screen on desktop and phone width; screenshot.
- [ ] **Step 5: Commit** `feat(sim): Two Nigerias split screen and ending`.

### Task 8: Phone performance and final verification

**Files:**
- Modify: `DioramaCanvas.svelte`, `Diorama.js` as needed
- Test: `sim.e2e.js`

- [ ] **Step 1: Failing e2e:** at viewport 375×812, `/sim/play` renders the diorama canvas and the page has no horizontal scroll (`document.documentElement.scrollWidth <= 375`).
- [ ] **Step 2:** Run → FAIL or PASS; if PASS, keep the test as a guard.
- [ ] **Step 3:** Low-detail mode as in Global Constraints; measure frame time in the browser (`performance.now()` around `draw`, logged once) at 375 px and on desktop; target ≤ 16 ms desktop, ≤ 33 ms low-detail.
- [ ] **Step 4:** `pnpm vitest run && pnpm test:e2e && pnpm check` → all PASS; final screenshots of setup, live view, Two Nigerias and ending.
- [ ] **Step 5: Commit** `perf(sim): low-detail diorama for phones`.
