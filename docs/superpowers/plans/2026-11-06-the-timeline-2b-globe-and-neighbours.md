# The Timeline — Plan 2b: Globe Opening and Neighbouring Countries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every run opens on a turning globe that dives into Nigeria and closes by pulling back out to it, and the diorama shows Nigeria's neighbours and the sea around it.

**Architecture:** A build script turns public-domain Natural Earth outlines into two small data files: world outlines in longitude/latitude for the globe, and the countries around Nigeria already converted into the diorama's SVG coordinates (using a fitted lon/lat → SVG transform). The `Diorama` class gains a second scene (the globe) and a camera "mode": the intro/outro camera is a pure function of playback time, and the hand-off between globe and diorama is a short dip drawn inside the canvas, so live view and video export look the same.

**Tech Stack:** Three.js 0.174 (`SphereGeometry`, `CanvasTexture`, `ShapeGeometry`, `Points`), Node build script, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-the-timeline-simulation-design.md` (Addendum 2026-11-06)
**Builds on:** Plan 2 (`Diorama`, `geometry.js` `toWorld`/`cellShapes`, `camera.js` `shotsFor`/`cameraAt`/`WIDE`, `timeline.js` `buildTimeline`/`createClock`, `LiveView.svelte`) and Plan 3 (`LiveView` props).

## Global Constraints

- Outline data from Natural Earth (public domain): `ne_110m_admin_0_countries.geojson` for the globe, `ne_50m_admin_0_countries.geojson` for the neighbours. Downloaded into `scripts/sim-data/.cache/` by `fetch.mjs`; attribution added to `sources.json`.
- No new runtime dependencies; no image textures. The globe texture is drawn onto a canvas at runtime.
- Shipped data stays under ~1 MB gzipped in total (existing test); `world.json` ≤ 150 KB raw, `region.json` ≤ 120 KB raw.
- Everything drawn is a pure function of `(run, t)`: no clocks, `Date.now()` or randomness in globe or camera code (stars use a fixed seed).
- Intro: **6 s**; outro: **4 s**. "Skip intro" button during the intro. Same intro on `/sim/play` and `/sim/run/[id]`.
- Low-detail (phones, `max-width: 767px`): globe texture 1024×512 instead of 2048×1024, 300 stars instead of 1,500.
- Nigeria on the globe is highlighted amber (`#f5c542`); other land `#3a4a3f`, sea `#0f2236`, borders `#1b1b1b`; neighbours on the diorama use the land colour at 60% with sea `#0f2236`.

## Review Focus

1. Seeking or scrubbing back into the intro window (t < 6 s) after playback started → camera returns to the globe shot for that time, never a blank or half-faded frame. Test in Task 4.
2. "Skip intro" pressed during the dive → jumps to t = 6 s with the diorama fully visible (no lingering dip). Test in Task 5.
3. Window resized during the intro → globe camera aspect updates, Nigeria stays centred. Browser check in Task 5.
4. Neighbour polygons crossing the diorama's sea plane or z-fighting with Nigeria's cells → neighbours sit below Nigeria's extrusion and never cover it. Browser check in Task 2.
5. Runs that end early (e.g. 2015–2025) → the outro still plays before the ending panel. Test in Task 5.

---

## File Structure

```
scripts/sim-data/build-world.mjs            Natural Earth → world.json + region.json
src/lib/game/sim/data/world.json            [{ id, name, rings: [[lon,lat]...][] }] (110m, rounded to 0.1°)
src/lib/game/sim/data/region.json           { neighbours: [{ id, name, rings: [[x,y]...][] , label:[x,y] }], frame: { x0,y0,x1,y1 } } in SVG units
src/lib/game/sim/geo.js                     lonLatToSvg(lon,lat), SVG_FIT (fitted constants), NIGERIA_CENTRE
src/lib/game/sim/intro.js                   INTRO, OUTRO, introCamera(t), outroCamera(tAfterEnd)
src/lib/components/sim/diorama/globe.js     createGlobe({ lowDetail }) → { scene, camera, draw(globeCam), dispose }
src/lib/components/sim/diorama/neighbours.js addNeighbours(scene) → dispose
tests: src/lib/game/sim/geo.test.js, intro.test.js; extend sim.e2e.js
```

---

### Task 1: World data and the lon/lat → SVG fit

**Files:**
- Create: `scripts/sim-data/build-world.mjs`, `src/lib/game/sim/geo.js`, `src/lib/game/sim/data/world.json`, `src/lib/game/sim/data/region.json`
- Modify: `scripts/sim-data/fetch.mjs` (two Natural Earth sources), `package.json` `sim:data` (append `build-world.mjs`), `src/lib/game/sim/data/index.js` (export `world`, `region`)
- Test: `src/lib/game/sim/geo.test.js`

**Interfaces:**
- `geo.js`: `SVG_FIT = { kind: 'mercator' | 'equirect', a, b, c, d }` (constants written by the build script into `region.json` and re-exported); `lonLatToSvg([lon, lat]) -> [x, y]`; `NIGERIA_CENTRE = [8.1, 9.6]` (lon, lat).
- Fit: in `build-world.mjs`, take Nigeria's polygon from the 50m file and the union of `cells.json` shapes; for both candidate projections (equirectangular `x = a·lon + b`, `y = c·lat + d`; Mercator with `y = c·ln(tan(π/4 + lat/2)) + d`) solve the 4 constants by least squares on the two bounding boxes plus the centroids of Kano, Lagos, Maiduguri and Calabar (lon/lat from Natural Earth populated places or hard-coded: Kano 8.52/12.0, Lagos 3.39/6.45, Maiduguri 13.16/11.85, Calabar 8.33/4.95); keep the projection with the smaller error and write it to `region.json`.
- `region.json.neighbours`: Benin, Niger, Chad, Cameroon, Togo, Equatorial Guinea (Bioko), clipped to the frame `lon −1…17, lat 1…17`, converted with the fit; `label` = polygon centroid inside the frame.

- [ ] **Step 1: Failing tests:** `the fit puts Kano, Lagos, Maiduguri and Calabar inside their cells` (point-in-polygon against `cellShapes` rings from `svgpath.js`); `the fit error is under 2% of the map width for those four cities`; `world.json has at least 170 countries and contains Nigeria`; `region.json has the six neighbours, each with at least one ring`; `world.json ≤ 150 KB and region.json ≤ 120 KB`.
- [ ] **Step 2:** `pnpm vitest run src/lib/game/sim/geo.test.js` → FAIL.
- [ ] **Step 3: Implement**; run `node scripts/sim-data/fetch.mjs && node scripts/sim-data/build-world.mjs`.
- [ ] **Step 4:** Tests PASS; `data.test.js` size test still PASS.
- [ ] **Step 5: Commit** `feat(sim): world outlines and neighbours data`.

### Task 2: Neighbours and sea on the diorama

**Files:**
- Create: `src/lib/components/sim/diorama/neighbours.js`
- Modify: `src/lib/components/sim/diorama/Diorama.js`

**Interfaces:**
- `addNeighbours(scene, { lowDetail }) -> () => void (dispose)`: a sea plane (`PlaneGeometry` covering the frame, y = −0.02, colour `#0f2236`); each neighbour as a flat `ShapeGeometry` at y = 0 (Nigeria's extrusion starts at 0 and rises 0.25, so neighbours never cover it), land colour at 60%; a thin outline; a label sprite (canvas texture, uppercase, 11 px equivalent, 50% white) at `label`.
- `Diorama` constructor calls `addNeighbours`; `dispose` calls the returned dispose. Background stays `#0e1116` outside the frame.

- [ ] **Step 1:** Browser check (no unit test: rendering): start the dev server, open a never-colonized run, screenshot at 1850 desktop and 375 px; confirm Benin, Niger, Chad and Cameroon are visible and dimmed, the coast meets the sea, Nigeria's cells sit on top (Review Focus 4), and the frame time stays ≤ 16 ms desktop (`performance.now()` around `draw`).
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Re-check and screenshot; existing unit and e2e suites PASS.
- [ ] **Step 4: Commit** `feat(sim): neighbouring countries and sea around the diorama`.

### Task 3: The globe renderer

**Files:**
- Create: `src/lib/components/sim/diorama/globe.js`

**Interfaces:**
- `createGlobe({ lowDetail }) -> { scene, camera, draw(renderer, globeCam), resize(w, h), dispose() }` where `globeCam = { lon, lat, distance, spin }` (degrees; `distance` in globe radii from the centre; `spin` extra rotation in degrees).
- Globe: `SphereGeometry(1, 64, 48)` (32×24 low detail) with a `CanvasTexture` drawn once from `world.json` in equirectangular: sea fill, land fill, borders, Nigeria amber; a slightly larger back-side sphere with additive blue glow; a `Points` star field on a fixed seed (`rng(hashString('stars'))` from `engine.js`).
- Camera looks at the globe centre from `(lon, lat)` at `distance`; `spin` rotates the globe about its axis.
- Pure helper (unit-testable): `lonLatToVec3(lon, lat, r) -> [x, y, z]` in `globe.js`.

- [ ] **Step 1: Failing test** (`intro.test.js`): `lonLatToVec3(0, 0, 1)` is `[0, 0, 1]` (± 1e-9) and `lonLatToVec3(90, 0, 1)` is `[1, 0, 0]`; `(0, 90)` is `[0, 1, 0]`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** PASS. Browser: temporary `?globe` flag on `/sim/play` that draws only the globe at `{ lon: 8.1, lat: 9.6, distance: 3.2, spin: 0 }`; screenshot; Nigeria amber and centred. Remove the flag.
- [ ] **Step 5: Commit** `feat(sim): stylised globe renderer`.

### Task 4: Intro and outro camera

**Files:**
- Create: `src/lib/game/sim/intro.js`
- Modify: `src/lib/game/sim/timeline.js` (`buildTimeline(run, { intro = INTRO })`: `duration` includes the intro; `yearAt(t < intro) = startYear`; `timeAt(year) ≥ intro`), `src/lib/game/sim/camera.js` (`cameraAt(shots, t)` returns `introCamera(t)` for `t < INTRO`; `shotsFor` offsets event shots by `INTRO`)
- Test: `src/lib/game/sim/intro.test.js`, update `timeline.test.js` / `hud.test.js` where they assume `t = 0` is the start year

**Interfaces:**
- `INTRO = 6`, `OUTRO = 4`.
- `introCamera(t) -> { mode: 'globe' | 'diorama', globe?: { lon, lat, distance, spin }, target?, zoom?, dip: 0..1, title: number (0..1 opacity of the year card) }`:
  - 0–2.5 s: globe, `lon` from −30 to 8.1, `lat` from 15 to 9.6 (smoothstep), `distance` 4.5, `spin` 0, `title` fades in 0–0.6 s and out 2.0–2.5 s;
  - 2.5–5.4 s: globe, `distance` eases 4.5 → 1.35 (Nigeria fills about the diorama's wide-shot width);
  - 5.4–6.0 s: `dip` rises 0 → 1 over 5.4–5.7 (globe), then falls 1 → 0 over 5.7–6.0 with `mode: 'diorama'`, `WIDE` target/zoom.
- `outroCamera(s)` for `s` seconds after the end (0–4): the reverse of 2.5–6.0 (diorama → dip → globe pulling back to distance 4.5).

- [ ] **Step 1: Failing tests:** `introCamera(0)` is globe mode, `title` 0; `introCamera(1)` has `title` 1; `introCamera(5.5).dip > 0` and `introCamera(6)` is diorama with `dip` 0 and `WIDE` target; `introCamera` is continuous (no jump > 0.2 in `distance` or `dip` between t and t+1/30 for t in 0..6); `buildTimeline` duration grows by 6 s and `yearAt(3) === startYear`; `cameraAt(shots, 3)` equals `introCamera(3)` (Review Focus 1); `outroCamera(4)` is globe at distance 4.5.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** PASS (all sim tests, calibration included).
- [ ] **Step 5: Commit** `feat(sim): intro and outro camera`.

### Task 5: Hand-off, skip and live view

**Files:**
- Modify: `Diorama.js` (owns a `createGlobe` instance; `draw(frame, camera)` renders the globe scene when `camera.mode === 'globe'`, the diorama otherwise; then a full-screen black quad at opacity `camera.dip`; the year card is not drawn in the canvas — see below), `LiveView.svelte` (intro: year card overlay "1850" + scenario label with opacity `camera.title`, "Skip intro" button while `t < INTRO` that sets `t = INTRO`; outro: after `t ≥ timeline.duration` keep the clock running for `OUTRO` seconds with `outroCamera`, then show the ending panel), `DioramaCanvas.svelte` (pass resize to the globe camera too)
- Test: extend `src/routes/sim/sim.e2e.js`

- [ ] **Step 1: Failing e2e:** `a run opens on the globe with a Skip intro button, then the year counter starts` (button visible at load, gone after 7 s); `Skip intro jumps straight to the start year` (Review Focus 2); `a 2015–2025 run plays the outro before the ending table` (ending heading not visible until ≥ 3 s after the last year; Review Focus 5); the phone no-scroll test still passes.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; Svelte autofixer on changed components.
- [ ] **Step 4:** All unit and e2e tests PASS; `pnpm check` clean. Browser: screenshots of the intro at 0 s, 3 s, 5.6 s (dip) and 6.5 s, the outro, and the intro at 375 px; resize the window mid-intro (Review Focus 3); measure frame time during the globe shot (≤ 16 ms desktop).
- [ ] **Step 5: Commit** `feat(sim): globe opening and closing in the live view`.
