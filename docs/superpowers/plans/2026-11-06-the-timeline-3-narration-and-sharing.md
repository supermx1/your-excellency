# The Timeline — Plan 3: Narration, Saving and Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runs can be saved and shared by link; playback shows AI-written narration and family vignettes from Workers AI's free allocation (with built-in narration when the daily budget is spent); the owner can feature runs and edit their narration.

**Architecture:** The server never runs the simulation (Workers Free allows 10 ms CPU). A saved run is its inputs (seed, switches, years, engine version), so `/sim/run/[id]` replays it in the browser; featured runs also keep their full recorded output (gzipped) so they survive later engine changes. Playback is split into **chapters**; for each chapter the browser builds a small, strictly-shaped **digest** of what the engine produced and asks `/api/sim/narrate` for prose. The server checks the budget, cache and digest, calls Workers AI, validates the JSON, caches it, and otherwise returns `null` so the browser uses template narration — the same pattern as `src/lib/server/policy-sim.js`.

**Tech Stack:** SvelteKit server routes on Cloudflare Workers, D1 (`DB`, database `fantasy-naija`), KV (`AI_CACHE`), Workers AI (`AI`), `CompressionStream`, vitest with in-memory fakes, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-the-timeline-simulation-design.md`
**Builds on:** Plans 1–2 (`runSimulation`, `ENGINE_VERSION`, `validateInputs`, `encodeInputs`, `buildTimeline`, `captionsAt`, `familyCardsAt`, the `/sim/play` page and its components).

## Global Constraints

- No new Cloudflare resources: reuse `DB` and `AI_CACHE`. One new D1 migration file.
- Workers AI free allocation is 10,000 neurons/day **account-wide**, shared with The Campaign. The Timeline's daily cap is **6,000 estimated neurons** (`SIM_DAILY_NEURONS`), counted in KV under `sim-neurons:<UTC date>`; at or over the cap, narration requests return `null` without calling the model.
- Model: `@cf/google/gemma-4-26b-a4b-it` (9,091 neurons per M input tokens, 27,273 per M output), fallback `@cf/meta/llama-3.2-3b-instruct` on error. Neuron estimate per call = `ceil(in/1e6 × 9091 + out/1e6 × 27273)` using the response's `usage` when present, else `prompt.length/4` and `max_tokens`.
- The AI only writes words about what the engine produced; it never decides outcomes. Prompts say "in this run", never present predictions as fact, and name no real living people. Fictional family names only (they come from the engine).
- Narration language: English.
- Owner-only actions use the existing admin password check: `platform.env.ADMIN_PASSWORD ?? 'emeka-local-admin'` (same as `src/routes/admin/+page.server.js`), extracted into one helper.
- Viewing a shared link needs no registration; starting a new run still goes through `RegisterGate`.
- Svelte code passes the Svelte MCP autofixer; JS keeps the `// @ts-nocheck` + JSDoc style of the other sim modules.

## Review Focus

1. A share link to a run id that doesn't exist, or a row written by an older engine version → friendly "run not found" / "made with an older version — showing the saved recording or replaying with today's rules" message, not a 500. Test in Task 5.
2. Narration request with a forged or oversized digest (huge strings, extra fields, 1,000 events) → rejected with 400 before any AI call. Test in Task 3.
3. Two visitors narrating the same saved chapter at once → one cached result; the second costs no neurons (cache read before the AI call). Test in Task 3.
4. Model returns malformed JSON, prose with markdown fences, or times out → `null` and the template narration shows; playback never waits more than ~6 s for a chapter. Test in Tasks 3 and 4.
5. Saving the same run twice (double click) → one row, same link. Test in Task 2.

---

## File Structure

```
migrations/0003_sim_runs.sql
src/lib/server/admin.js            isAdmin(platform, password)
src/lib/server/sim-runs.js         D1 repository
src/lib/server/sim-narrate.js      budget, cache, prompt, model call, validation
src/lib/server/*.test.js           with fake D1 / KV / AI
src/lib/game/sim/narration.js      chaptersFor, digestChapter, fallbackNarration, validateDigest
src/lib/game/sim/narration.test.js
src/lib/game/sim/recording.js      packOutput / unpackOutput (gzip + base64)
src/routes/api/sim/runs/+server.js           POST save
src/routes/api/sim/runs/[id]/feature/+server.js   POST (owner) feature + store output
src/routes/api/sim/narrate/+server.js        POST narrate
src/lib/components/sim/LiveView.svelte       the live view, moved out of /sim/play
src/lib/components/sim/Narration.svelte
src/lib/components/sim/ShareButton.svelte
src/routes/sim/play/+page.svelte             thin: decode ?s= → LiveView
src/routes/sim/run/[id]/+page.server.js, +page.js (ssr=false for the view), +page.svelte
src/routes/sim/+page.server.js, +page.svelte  featured gallery
src/routes/admin/sim/+page.server.js, +page.svelte   owner: feature, edit narration
```

---

### Task 1: Storage and the admin helper

**Files:**
- Create: `migrations/0003_sim_runs.sql`, `src/lib/server/admin.js`, `src/lib/server/sim-runs.js`, `src/lib/server/test-fakes.js`
- Modify: `src/routes/admin/+page.server.js` (use `isAdmin`)
- Test: `src/lib/server/sim-runs.test.js`

**Interfaces:**
- Migration:
  ```sql
  CREATE TABLE IF NOT EXISTS sim_runs (
  	id TEXT PRIMARY KEY,
  	inputs_hash TEXT NOT NULL UNIQUE,
  	engine_version INTEGER NOT NULL,
  	inputs TEXT NOT NULL,
  	title TEXT,
  	featured INTEGER NOT NULL DEFAULT 0,
  	narration TEXT,
  	summary TEXT,
  	output BLOB,
  	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS sim_runs_featured ON sim_runs (featured, created_at);
  ```
- `isAdmin(platform, password) -> boolean`.
- `sim-runs.js`:
  - `saveRun(db, { inputs, engineVersion, summary? }) -> { id }` — `inputs_hash` = SHA-256 of `JSON.stringify(inputs)` + engine version; on conflict returns the existing id (Review Focus 5). `id` = 10 chars from `[0-9a-zA-Z]` via `crypto.getRandomValues`.
  - `getRun(db, id) -> { id, engineVersion, inputs, title, featured, narration: object|null, summary, output: string|null } | null`.
  - `listFeatured(db, limit = 12) -> { id, title, inputs, summary }[]` newest first.
  - `setFeatured(db, id, { featured, title, output })`, `saveNarration(db, id, narration)`.
- `test-fakes.js`: `fakeD1()` (Map-backed; supports exactly the SQL strings `sim-runs.js` uses), `fakeKV()`, `fakeAI(responder)`.

- [ ] **Step 1: Failing tests:** `saveRun returns an id and getRun reads it back`; `saving identical inputs twice returns the same id`; `getRun of an unknown id is null`; `listFeatured lists only featured runs, newest first`; `isAdmin accepts the env password and rejects others`.
- [ ] **Step 2:** `pnpm vitest run src/lib/server/sim-runs.test.js` → FAIL.
- [ ] **Step 3: Implement.** Apply locally: `pnpm wrangler d1 migrations apply fantasy-naija --local`.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** `feat(sim): runs table, repository and admin helper`.

### Task 2: Save and share API

**Files:**
- Create: `src/routes/api/sim/runs/+server.js`, `src/lib/game/sim/recording.js`
- Test: `src/routes/api/sim/runs/runs.test.js`, `src/lib/game/sim/recording.test.js`

**Interfaces:**
- `POST /api/sim/runs` body `{ inputs, summary? }` → `validateInputs`; reject with 400 + `{ error }` when invalid; rate limit 30 saves per IP per UTC day (`CF-Connecting-IP`, KV key `sim-saves:<date>:<ip>`, 429 over); `200 { id, url: '/sim/run/<id>' }`. Without `DB` → 503 `{ error: 'Saving is unavailable right now.' }`.
- `packOutput(run) -> Promise<string>` (JSON → gzip via `CompressionStream` → base64) and `unpackOutput(str) -> Promise<RunResult>`.

- [ ] **Step 1: Failing tests:** API: `saves valid inputs and returns a /sim/run link`; `rejects startYear 1700 with 400`; `double save returns the same id`; `31st save from one IP in a day gets 429`; `no DB gives 503`. Recording: `pack then unpack round-trips a baseline run`; `packed baseline run is under 600 KB`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(sim): save and share API`.

### Task 3: Chapters, digests and the narration server

**Files:**
- Create: `src/lib/game/sim/narration.js`, `src/lib/server/sim-narrate.js`, `src/routes/api/sim/narrate/+server.js`
- Test: `src/lib/game/sim/narration.test.js`, `src/lib/server/sim-narrate.test.js`

**Interfaces:**
- `chaptersFor(run) -> { index, from, to, title }[]` — chapters end at key years (`buildTimeline(run).keyYears`) and are at most 25 years long; the last ends at the run's end year.
- `digestChapter(run, chapter) -> Digest`:
  ```js
  {
  	scenario: string,              // preset label or "What if"
  	from: number, to: number,
  	totals: { start: {pop, litAny, lifeExp}, end: {pop, litAny, lifeExp} },
  	polities: string[],            // names alive at `to`, ≤ 20
  	events: { year, kind, title }[],          // ≤ 25, most important first (war, secession, union, invention, history, coup, world)
  	ours: string[],                // real-history captions skipped by this run, ≤ 5
  	families: { surname, member, year, text }[]   // ≤ 6
  }
  ```
- `validateDigest(d) -> { ok: true, digest } | { ok: false, error }` — exact keys only; strings ≤ 160 chars; numbers finite; array caps as above; years 1850–2100 (Review Focus 2).
- `fallbackNarration(digest) -> { text: string, vignettes: string[] }` — template sentences from the top 3 events, the population change, and each family line.
- `narrate(platform, { runId, chapterIndex, digest }) -> Promise<{ text, vignettes } | null>`:
  1. cache key `sim-narr:<runId or sha256(digest)>:<chapterIndex>`; return the cached value without touching the budget (Review Focus 3);
  2. if the saved run has owner-edited narration for this chapter, return it;
  3. read the day's counter; if `>= SIM_DAILY_NEURONS` return `null`;
  4. call the model with `response_format` JSON schema `{ text: string ≤ 900 chars, vignettes: string[] ≤ 4, each ≤ 300 chars }`, `max_tokens: 500`, 6 s timeout via `Promise.race`;
  5. validate (strip ```` ``` ```` fences, parse, check lengths); invalid → `null`;
  6. add the estimated neurons to the counter, cache for 90 days, return.
- System prompt (exact text): `You narrate one chapter of a simulated alternate history of Nigeria for a YouTube video. Write in plain, vivid English for a general audience. Describe only what the data says happened in this run; never invent wars, inventions or deaths that are not listed, and never present it as a prediction. Compare with real history only using the "ours" lines. Families are fictional; write one short vignette per family listed, in the third person, present tense. No real living people. Reply with JSON only.`
- `POST /api/sim/narrate` body `{ runId?, chapterIndex, digest }` → `validateDigest` (400 on failure) → `narrate` → `200 { narration }` (`null` = use fallback).

- [ ] **Step 1: Failing tests:** narration: `chapters cover the run without gaps and none exceeds 25 years`; `a baseline 1850 run has a chapter ending at 1914`; `digests of a baseline run pass validateDigest`; `validateDigest rejects extra keys, a 10,000-char title and 1,000 events`; `fallbackNarration mentions the first event title`. Server (fake KV/AI/D1): `a cache hit spends no neurons and does not call the model`; `over the daily cap returns null without calling the model`; `valid model JSON is cached and the counter increases`; `fenced JSON is accepted`; `malformed JSON returns null`; `a model that never answers returns null within the timeout` (fake timers); `owner-edited narration wins over the cache`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(sim): chapters, digests and AI narration with budget guard`.

### Task 4: Live view with narration and sharing

**Files:**
- Create: `src/lib/components/sim/LiveView.svelte` (moved from `src/routes/sim/play/+page.svelte`), `Narration.svelte`, `ShareButton.svelte`
- Modify: `src/routes/sim/play/+page.svelte` (decode `?s=`, render `LiveView` with `inputs`), `Hud.svelte` (narration slot above the caption), `Ending.svelte` (Share button), `src/lib/components/sim/FamilyCard.svelte` (vignette text when available)
- Test: extend `src/routes/sim/sim.e2e.js`

**Interfaces:**
- `LiveView.svelte` props `{ inputs?: RunInputs, recorded?: RunResult, runId?: string, featured?: boolean, narration?: object }` — uses `recorded` when given, otherwise runs `inputs` in the worker. Everything else as in Plan 2.
- Narration loading: when playback enters a chapter, request it and prefetch the next one; show the template narration immediately and swap in the AI text when it arrives (Review Focus 4: playback never waits). Narration panel: a dark card, bottom-left above the caption, max 3 lines visible with "More" to expand; `aria-live="polite"`.
- `ShareButton.svelte` props `{ inputs, summary, runId? }`: if `runId` exists, copies `/sim/run/<id>`; otherwise POSTs to `/api/sim/runs`, then copies; shows "Link copied" or the error.

- [ ] **Step 1: Failing e2e:** `narration text appears within 8 s of playback starting` (template or AI); `Share on the ending copies a /sim/run/ link` (grant clipboard permissions in the test context); with `page.route('**/api/sim/narrate', r => r.abort())`: `narration still shows (template)`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; autofix each `.svelte` file.
- [ ] **Step 4:** e2e PASS; existing Plan 2 e2e tests still pass; browser check with screenshots.
- [ ] **Step 5: Commit** `feat(sim): narration in the live view and share links`.

### Task 5: Share pages

**Files:**
- Create: `src/routes/sim/run/[id]/+page.server.js`, `+page.svelte`
- Test: extend `sim.e2e.js`

**Interfaces:**
- `load({ params, platform })` → `getRun`; unknown id → `error(404, 'This run doesn't exist (or was deleted).')`; returns `{ id, inputs, engineVersion, featured, title, narration, output }` (output as the packed string; unpacked in the browser).
- Page: if `output` exists → `LiveView recorded={unpackOutput(output)}`; else if `engineVersion !== ENGINE_VERSION` → a notice "This run was made with an older version of the simulation; it's replayed with today's rules, so details may differ." above `LiveView inputs={inputs}`; else `LiveView inputs={inputs} runId={id}`. Open Graph tags: title (`title` or scenario label), description "A simulated alternate history of Nigeria — The Timeline", `og:url`.

- [ ] **Step 1: Failing e2e:** `saving then opening the link replays the same 2025 population` (read the ending table on both); `/sim/run/doesnotexist shows the not-found message` (Review Focus 1). Unit test for `load` with fake D1: `older engine version sets the notice flag`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; autofix.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(sim): share pages for saved runs`.

### Task 6: Featured runs and owner editing

**Files:**
- Create: `src/routes/api/sim/runs/[id]/feature/+server.js`, `src/routes/sim/+page.server.js`, `src/routes/admin/sim/+page.server.js`, `src/routes/admin/sim/+page.svelte`
- Modify: `src/routes/sim/+page.svelte` (featured gallery), `LiveView.svelte` (owner-only "Feature this run" control behind a password prompt)
- Test: `src/routes/admin/sim/admin-sim.test.js`, extend `sim.e2e.js`

**Interfaces:**
- `POST /api/sim/runs/[id]/feature` body `{ password, title, output }` → `isAdmin` (401 otherwise); `output` must unpack to a run whose `inputs` equal the saved inputs and whose `engineVersion` matches the row (400 otherwise); stores `featured = 1`, `title`, `output`.
- `/sim` load → `listFeatured(db)`; gallery of cards (title, scenario label, start year, "Watch →" link) above the scenario cards; hidden when empty or `DB` is missing.
- `/admin/sim`: password form (same pattern as `/admin`); lists featured runs; per run: title field, unfeature button, and one textarea per chapter (prefilled with the cached or edited narration as JSON `{ text, vignettes }`); save calls `saveNarration` and deletes that chapter's KV cache entry.

- [ ] **Step 1: Failing tests:** `feature with a wrong password is 401`; `feature with output for different inputs is 400`; `featured run appears on /sim` (e2e with the local D1); `edited narration is served by /api/sim/narrate for that chapter`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; autofix.
- [ ] **Step 4:** PASS; `pnpm vitest run && pnpm check` clean; all e2e pass.
- [ ] **Step 5: Commit** `feat(sim): featured runs and owner narration editing`.
