# The Timeline — Plan 1: Data and Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A headless, tested Nigeria "what if" simulation engine (1850–2100) fed by real data, with switches, the two presets, religion, families, and a baseline that roughly reproduces real Nigeria.

**Architecture:** Plain JavaScript, Mesa-like: a `World` holds year, seeded RNG, cells (the 37 state shapes), polities and families; `stepWorld` runs rule modules in a fixed order once per year and appends a snapshot to the history. Data scripts download raw sources once into a gitignored cache and write small JSON files the engine imports. A Web Worker wrapper runs the engine off the main thread for later plans.

**Tech Stack:** JavaScript (JSDoc, `// @ts-nocheck` like the other engines), vitest, Node scripts, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-05-the-timeline-simulation-design.md`

**Later plans (not this one):** 2 — hub card, `/sim` pages, 3D diorama, Two Nigerias, live mode. 3 — narration (Workers AI + budget guard + fallback), D1 runs table, share links, featured runs, admin editing. 4 — HyperFrames export with Kokoro voice.

## Global Constraints

- Plain JS, no simulation framework, no new runtime dependency for the engine.
- Same rules for every group and every faith: no rule, parameter or switch keyed by an ethnic group or a faith.
- The AI never decides outcomes (no AI in this plan at all).
- Start year 1850–2025; runs end at 2025, optionally continue to 2100.
- Literacy counts any script (Latin, Arabic, Ajami); official school literacy tracked separately.
- Shipped data under ~1 MB gzipped total; raw downloads live in a gitignored cache (`scripts/sim-data/.cache/`).
- Reuse `hashString` and `rng` from `src/lib/game/engine.js`; nothing else from the other games.
- Every data file records its sources (name, URL, licence) for the attribution page.

## Review Focus

1. A preset whose events have unmet preconditions (civil war 1967 with no Nigeria) — expect the event to be skipped silently, run continues. Test in Task 7.
2. Population or shares going negative / NaN after a war, famine or epidemic in a tiny cell — expect clamped, finite values. Test in Task 4.
3. A cell whose polity is destroyed or split — expect every cell always owned by exactly one polity. Test in Task 6.
4. Start year late (e.g. 2020) with continue-to-2100 — expect a valid run using the real starting map for that year. Test in Task 9.
5. Switch object with unknown keys or out-of-range values from a share link — expect rejection, not a crash. Test in Task 9.

---

## File Structure

```
scripts/sim-data/
  fetch.mjs            download raw sources into .cache/ (idempotent)
  build-cells.mjs      37 cells from @svg-maps/nigeria: centroid, area, neighbours, coastal
  build-national.mjs   national real series 1850–2100 → national.json
  build-regional.mjs   HYDE population by cell (1850/1900/1950/2000), DHS/census religion & literacy by cell → regional.json
  authored/            hand-written JSON with sources: polities-1850.json, real-borders.json, events.json, tech.json, names.json
src/lib/game/sim/
  data/                generated JSON (committed) + copies of authored/
  types.js             JSDoc typedefs only
  world.js             createWorld, stepWorld, runSimulation, ENGINE_VERSION
  switches.js          SWITCHES catalog, PRESETS, defaultSwitches, validateSwitches
  rules/demography.js  rules/economy.js  rules/religion.js  rules/conflict.js
  rules/polities.js    rules/tech.js      rules/events.js    rules/families.js
  worker.js            Web Worker wrapper
  *.test.js            next to the code they test
```

---

### Task 1: World core, RNG and history recorder

**Files:**
- Create: `src/lib/game/sim/types.js`, `src/lib/game/sim/world.js`
- Test: `src/lib/game/sim/world.test.js`

**Interfaces:**
- Produces: `ENGINE_VERSION = 1`; `createWorld(inputs, data) -> World`; `stepWorld(world) -> void`; `runSimulation(inputs, data?) -> RunResult`.
  - `inputs = { seed: number, switches: Switches, startYear: number, endYear: number }`
  - `World = { year, rand: () => number, cells: Cell[], polities: Polity[], families: Family[], events: SimEvent[], history: YearSnapshot[], switches, data }`
  - `RunResult = { engineVersion, inputs, history: YearSnapshot[], events: SimEvent[], families: Family[] }`
  - `YearSnapshot = { year, cells: {id, polityId, pop, urban, litAny, litSchool, lifeExp, incomePc, religion:{islam,christian,traditional}}[], polities: {id, name, cellIds}[], totals: {pop, litAny, litSchool, lifeExp, urban, wars} }`
  - `rules` run in this order each year: events → polities → conflict → religion → tech → economy → demography → families; each is `(world) => void`. Until later tasks land, `world.js` imports stubs (empty functions) from `rules/*.js`.

- [ ] **Step 1: Write failing tests** `same seed gives identical history`, `different seeds give different histories` (compare `JSON.stringify(history)`; use a tiny fixture data object with 3 cells), `history has one snapshot per year from startYear to endYear inclusive`.
- [ ] **Step 2:** `pnpm vitest run src/lib/game/sim/world.test.js` → FAIL (module not found).
- [ ] **Step 3: Implement** `world.js` with `rand = rng(hashString(String(seed)))`; `createWorld` deep-clones starting cells/polities from `data`; `stepWorld` calls the rule functions in the order above, then pushes a snapshot, then `year += 1`. Default `data` = imports from `./data/`.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5: Commit** `feat(sim): world core with seeded history recorder`.

### Task 2: Cells from the map

**Files:**
- Create: `scripts/sim-data/build-cells.mjs`, `src/lib/game/sim/data/cells.json`
- Test: `src/lib/game/sim/data.test.js`
- Modify: `.gitignore` (add `scripts/sim-data/.cache/`), `package.json` (script `"sim:data": "node scripts/sim-data/fetch.mjs && node scripts/sim-data/build-cells.mjs && node scripts/sim-data/build-national.mjs && node scripts/sim-data/build-regional.mjs"`)

**Interfaces:**
- Produces: `cells.json = [{ id, name, centroid:[x,y], area, coastal:boolean, neighbours:string[] }]` (ids = `@svg-maps/nigeria` ids, 37 entries).

- [ ] **Step 1: Failing tests:** `cells.json has 37 cells`; `neighbours are symmetric`; `lagos neighbours include ogun`; `kano neighbours include jigawa and kaduna`; `every cell has at least one neighbour`; `coastal includes lagos, delta, bayelsa, rivers, akwa-ibom, cross-river, ondo, ogun`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** the script: parse SVG paths into points (relative/absolute `m l` commands), area by shoelace, centroid by mean of points, neighbours = any vertex within 1.5 viewBox units of the other shape's vertices; coastal from the list above (hand-listed, since the SVG has no sea).
- [ ] **Step 4:** `node scripts/sim-data/build-cells.mjs && pnpm vitest run src/lib/game/sim/data.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(sim): cell map with neighbours`.

### Task 3: Real data pipeline

**Files:**
- Create: `scripts/sim-data/fetch.mjs`, `build-national.mjs`, `build-regional.mjs`, `src/lib/game/sim/data/national.json`, `regional.json`, `sources.json`
- Create (authored, with a `sources` array in each): `scripts/sim-data/authored/polities-1850.json`, `real-borders.json`, `events.json`, `tech.json`, `names.json`, copied into `src/lib/game/sim/data/` by `build-regional.mjs`
- Test: extend `src/lib/game/sim/data.test.js`

**Interfaces:**
- Produces:
  - `national.json = { years:number[], pop, lifeExp, litSchool, urban, gdpPc, electricityKwhPc, oilBblDay }` — arrays aligned to `years` (1850–2100, nulls where unknown; future pop from UN WPP medium variant).
  - `regional.json = { pop: {[year:1850|1900|1950|2000]: {[cellId]: number}}, religion: {[1850|1952|1963|2018]: {[cellId]: {islam,christian,traditional}}}, litSchool2018: {[cellId]: number} }`
  - `polities-1850.json = [{ id, name, capitalCell, cellIds, government, stateReligion }]` covering all 37 cells exactly once (spec list: Sokoto Caliphate, Borno, Yoruba states, Benin, Igala, Igbo communities, Delta & Cross River city-states, Middle Belt peoples).
  - `real-borders.json = [{ year, polities:[{id,name,cellIds}] }]` for 1850, 1861, 1885, 1900, 1906, 1914, 1960, 1967, 1976, 1987, 1991, 1996 (cells grouped by the real units of that year, coarse).
  - `events.json = [{ id, year, kind:'history'|'world', switch?:string, requires?:string[], effects:{...}, title, source }]` — history kinds from the spec (Lagos 1861 … Boko Haram 2009); world kinds: droughts 1913–14, 1972–74, 1983–84; 1918 flu; Ebola 2014; COVID 2020; world wars; oil price series.
  - `tech.json = [{ id, name, worldYear, nigeriaYear?, requires:string[], effects:{mortality?,productivity?,war?,literacy?} }]` (~40 items, 1800–2025).
  - `names.json = { hausa:[], kanuri:[], yoruba:[], edo:[], igbo:[], ijaw:[], efik:[] }` + `cellLanguage: {[cellId]: key}`.
  - `sources.json = [{ name, url, licence, files:string[] }]`.

- [ ] **Step 1: Failing tests:** national pop 1950 between 30M and 45M and 2025 between 200M and 260M; `regional.pop[1850]` sums to the national 1850 value ±5%; religion shares per cell sum to 1 ±0.01 for every year; `polities-1850` covers every cell exactly once; every `real-borders` snapshot covers every cell exactly once; every event `requires` id refers to an existing event or polity-state flag listed in `events.json` header; gzipped size of `src/lib/game/sim/data/` < 1,000,000 bytes.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement `fetch.mjs`** (skip files already in `.cache/`): OWID CSVs via `https://ourworldindata.org/grapher/<slug>.csv?v=1&csvType=full&useColumnShortNames=false` for population, life expectancy, literacy, urban share, GDP per capita (Maddison), electricity, oil production; World Bank API (`api.worldbank.org/v2/country/NGA/indicator/<code>?format=json&per_page=200`); UN WPP 2024 medium-variant Nigeria CSV; HYDE 3.3 `popc` ASC grids for 1850/1900/1950/2000 (Utrecht Yoda public link); DHS STATcompiler API for state religion and literacy. Write `.cache/manifest.json` with URL, date and licence per file.
- [ ] **Step 4: Implement `build-national.mjs`** (interpolate linearly inside gaps, never extrapolate before the first real point except pop, which uses OWID's long-run series) and **`build-regional.mjs`** (HYDE: sum grid cells whose centre falls inside each cell polygon, then scale to the national total; religion 1952/1963 by old region spread evenly over that region's cells; 1850 shares from `authored/` estimates).
- [ ] **Step 5: Hand-author the `authored/` files**, each with `sources`. Events and tech use Wikipedia (MediaWiki API) and Wikidata P575 as references, curated by hand; keep effects as small numeric modifiers documented in the file header.
- [ ] **Step 6:** `pnpm sim:data && pnpm vitest run src/lib/game/sim/data.test.js` → PASS.
- [ ] **Step 7: Commit** `feat(sim): real data pipeline and authored history data`.

### Task 4: Demography and economy rules

**Files:**
- Create: `src/lib/game/sim/rules/demography.js`, `rules/economy.js`
- Test: `src/lib/game/sim/rules/demography.test.js`

**Interfaces:**
- Consumes: `World`, `Cell` from Task 1.
- Produces: `stepDemography(world)`, `stepEconomy(world)`. Cell fields written: `pop, urban, lifeExp, incomePc, litAny, litSchool`. Uses `cell.mods` (`{mortality, productivity, learning}` multipliers that other rules and switches set; default 1).

- [ ] **Step 1: Failing tests:** `population grows when nothing bad happens` (1 cell, 50 years); `higher literacy lowers birth and death rates` (two cells, same pop); `war damage reduces population that year`; `values stay finite and pop >= 0 after a 90% mortality shock` (Review Focus 2); `learning switch x3 raises litAny faster than x1`; `urban share rises with income`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Birth rate and death rate fall with literacy, income and tech (demographic transition); lifeExp derived from death rate; litAny grows from schools of any kind (`cell.schools.quranic + cell.schools.western`), litSchool only from western schools; incomePc from sector productivity × infrastructure; clamp every field.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): demography and economy rules`.

### Task 5: Religion

**Files:**
- Create: `src/lib/game/sim/rules/religion.js`
- Test: `src/lib/game/sim/rules/religion.test.js`

**Interfaces:**
- Produces: `stepReligion(world)`; writes `cell.religion {islam, christian, traditional}` (sum 1), `cell.schools {quranic, western}`, `cell.tension` (0–1). Reads `switches.religiousTolerance`, `switches.christianMissions`, `switches.stateReligion`, `switches.sharia`, polity `stateReligion`.

- [ ] **Step 1: Failing tests:** `shares always sum to 1`; `missions off → christian share stays at 0 where it starts at 0`; `higher tolerance → lower average tension over 100 years`; **`mirror test`**: a 4-cell map run with Islam in cells A,B and Christianity in C,D gives the same tension/war/literacy series as the swapped map (C,D Islam; A,B Christianity) with the same seed (proves same rules for every faith); `state religion raises that faith's share in the polity's cells over time`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** with one symmetric function for all faiths: conversion flow toward neighbours' and the polity's faiths weighted by contact (trade, migration) and schools; schools attached to a faith grow with that faith's share and with funding; tension = religious difference within and across neighbouring cells × (1 − tolerance), lowered by income growth. No branch on a faith name except reading the switches that name an event (missions, sharia).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): symmetric religion model`.

### Task 6: Polities and conflict

**Files:**
- Create: `src/lib/game/sim/rules/polities.js`, `rules/conflict.js`
- Test: `src/lib/game/sim/rules/conflict.test.js`

**Interfaces:**
- Produces: `stepPolities(world)` (unions, splits, secessions, coups, government changes), `stepConflict(world)` (wars start, fight, end). `Polity = { id, name, capitalCell, cellIds, government, stateReligion, treasury, army, stability, knowledge, atWarWith: string[] }`. Events pushed to `world.events` as `{ year, kind:'war'|'peace'|'union'|'split'|'coup'|'secession', polityIds, cellIds, deaths?, title }`.

- [ ] **Step 1: Failing tests:** `every cell is owned by exactly one polity every year for 175 years across 20 seeds` (Review Focus 3); `a war records deaths and ends`; `trust switch high → fewer wars over 20 seeds`; `coups switch off → no coup events`; `a polity with no cells is removed`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** War chance per neighbouring polity pair from tension, population pressure, stability, army ratio, `switches.trust`, chance; outcomes move border cells; unions/federations when stability and trade are high; splits/secessions when stability is low and tension high.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): polities, wars, coups and borders`.

### Task 7: Technology and events

**Files:**
- Create: `src/lib/game/sim/rules/tech.js`, `rules/events.js`
- Test: `src/lib/game/sim/rules/events.test.js`

**Interfaces:**
- Produces: `stepTech(world)` (polity `knowledge`, adopted tech ids per polity `polity.tech:Set`→array in snapshots; events `{kind:'invention'|'adoption', techId, polityIds, year, aheadOfReal?:number}`), `stepEvents(world)` (applies `events.json` by year: `world` kind always; `history` kind only if its `switch` is on and every `requires` holds).

- [ ] **Step 1: Failing tests:** `conquest off → no amalgamation event`; `civil war event skipped without error when Nigeria does not exist` (Review Focus 1); `world events (1918 flu) fire in every run`; `learning x3 → at least one invention before its real world year in most of 20 seeds`; `learning x1 → technologies arrive no earlier than worldYear`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Adoption lag shrinks with literacy, trade and contact; own invention possible when knowledge exceeds the tech's threshold (scaled by learning switch); effects applied to `cell.mods`. Preconditions are named flags (`nigeriaExists`, `britishRule`, `oilFound`, …) computed from world state each year.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): technology spread and real-history events`.

### Task 8: Families

**Files:**
- Create: `src/lib/game/sim/rules/families.js`
- Test: `src/lib/game/sim/rules/families.test.js`

**Interfaces:**
- Produces: `stepFamilies(world)`; `Family = { id, surname, homeCell, members: [{ name, born, died?, cell, occupation, canRead, faith, lifeEvents: {year, kind, text}[] }] }`. Four families at start in cells chosen by `createWorld`: kano, oyo, anambra, cross-river (names from `names.json` by `cellLanguage`).

- [ ] **Step 1: Failing tests:** `four families exist from the start year`; `a new generation appears roughly every 20–30 years`; `a member's canRead probability follows the cell's litAny` (statistical over seeds); `members can die in a war that hits their cell`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Faith of each member drawn from the cell's shares (inherited with high probability); occupation from sector mix; migration to the largest city nearby when income gap is large.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): families across generations`.

### Task 9: Switches, presets, validation and worker

**Files:**
- Create: `src/lib/game/sim/switches.js`, `src/lib/game/sim/worker.js`
- Test: `src/lib/game/sim/switches.test.js`

**Interfaces:**
- Produces:
  - `SWITCHES`: `{ [key]: { group, label, description, type:'bool'|'enum'|'number'|'year', default, options?, min?, max? } }` with keys: `britishConquest, amalgamation, independenceYear, civilWar, coups ('off'|'history'|'likely'), oilDiscovery, oilYear, learning (1–3), health (0.5–1.5), trust ('low'|'history'|'high'), oilInGround, malaria (0.5–1.5), drought (0.5–1.5), power24hFromYear (null|year), freeSchoolingFromYear, corruption ('low'|'history'|'high'), religiousTolerance ('low'|'history'|'high'), christianMissions, stateReligion ('secular'|'choose'|'history'), sharia`.
  - `PRESETS = { neverColonized: { label, description, startYear: 1850, switches: { britishConquest:false, amalgamation:false, … } }, genius: { label, description, startYear: 1960, switches: { learning: 3 } } }`.
  - `defaultSwitches() -> Switches`; `validateSwitches(input) -> { ok:true, switches } | { ok:false, error }` (rejects unknown keys and out-of-range values; Review Focus 5).
  - `worker.js`: `onmessage({ inputs, extraSeeds? })` → posts `{ type:'result', run }` then, if `extraSeeds`, `{ type:'summary', runs: n, stats }` where stats counts wars, civil wars, Nigeria-formed, and the min/median/max of 2025 pop and literacy.
  - `createWorld` picks the starting map for `startYear` from `real-borders.json` (latest snapshot ≤ startYear) unless the preset overrides it.

- [ ] **Step 1: Failing tests:** `validateSwitches rejects {foo:1}`; `rejects learning: 9`; `accepts every preset`; `neverColonized preset run from 1850 has no britishRule flag in any year`; `start year 2020 with endYear 2100 runs and uses the 1996 borders` (Review Focus 4); `no switch key names a faith or ethnic group as a target of different rules` (assert keys list equals the spec list).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Worker imports `runSimulation`; summary runs seeds `seed+1 … seed+extraSeeds`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(sim): switches, presets and worker`.

### Task 10: Baseline calibration

**Files:**
- Create: `src/lib/game/sim/calibration.test.js`, `src/lib/game/sim/params.js` (all tunable constants in one place)
- Modify: rule files to read constants from `params.js`

**Interfaces:**
- Consumes: `runSimulation`, `defaultSwitches`, `national.json`.
- Produces: `PARAMS` object; `pnpm sim:calibrate` script (`node scripts/sim-data/calibrate.mjs`) printing simulated vs real tables for the baseline over 30 seeds.

- [ ] **Step 1: Failing test** `baseline (all switches at history, 1850 start) tracks real Nigeria`, mean over 30 seeds: population within ±15% at 1900, 1950, 2000, 2025; school literacy within ±10 points at 2018; life expectancy within ±5 years at 2020; urban share within ±10 points at 2020; Nigeria forms in ≥ 90% of seeds; civil war happens in ≥ 50% of seeds.
- [ ] **Step 2:** Run → FAIL (or pass by luck — then tighten nothing, move on).
- [ ] **Step 3: Tune `PARAMS`** with `pnpm sim:calibrate` until it passes. Do not add per-region or per-faith constants to make it pass.
- [ ] **Step 4:** `pnpm vitest run src/lib/game/sim` → all PASS; `pnpm check` clean for the new files.
- [ ] **Step 5: Commit** `feat(sim): calibrated baseline`.
