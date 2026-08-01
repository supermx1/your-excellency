# Multi-game split + city builder ("The Constituency")

Date: 2026-08-01

## Summary

Three pieces, ship in this order:

- **A. Player count** — badge showing registered leads (real count + a fixed marketing baseline), on the new hub.
- **B. Hub + route split** — `/` becomes a game-select hub; today's game moves to `/campaign` and gets split out of its single 905-line file. `/city` is the new game's route.
- **C. The Constituency** — a new turn-based city-development game. Spend an allocation on a fictional constituency (schools, hospitals, roads, power, water, security, housing, markets/business, or embezzle it), placed on an 8×8 terrain grid with adjacency effects, over a 12-turn (quarterly, one 3-year term) run. Scored on constituent satisfaction, tempered by an embezzlement/scrutiny track.

The two games share only the UI shell (layout, footer, neo-brutalist visual style, the registration gate, the player-count badge). Engines, state shape, and localStorage keys are fully separate — no shared save data, no unlocks between them.

## A. Player count

- `src/lib/server/players.js`: `getPlayerCount(platform)` — `SELECT COUNT(*) AS n FROM leads`, module-level cache with a 60s TTL (mirrors the `readRulebook`/KV-cache pattern already used for the rulebook). No DB binding (local dev) → returns just the baseline.
- `PLAYER_BASELINE = 2400` — a fixed offset added to the real count so the badge never reads as a dead site. It is a real number shown to real users, not a true count; flagged here so it's easy to find and drop later.
- `src/lib/components/PlayerCount.svelte`: takes a `count` prop, renders a pill: *"4,113 have taken the oath"*.
- Displayed once, as a hero badge on the hub (`/`). Also referenced in `RegisterGate`'s copy ("join 4,113 others").

## B. Hub + route split

- `/` (`src/routes/+page.svelte` + new `+page.server.js`): game-select hub. Two neo-brutalist cards — "The Campaign" → `/campaign`, "The Constituency" → `/city`. Player count badge. Uses the existing visual language (thick black borders, hard drop shadows, `bg-amber-100` page background, `bg-emerald-400` header band).
- `/campaign`: today's game, moved from `src/routes/+page.svelte`. Split out of the single file along its existing phase boundaries into `src/lib/components/campaign/`:
  - `CandidateSetup.svelte` (the pre-run character builder)
  - `CampaignPhase.svelte`, `ElectionPhase.svelte`, `PolicyPhase.svelte`, `TribunalPhase.svelte`, `LegacyPhase.svelte`
  - `NigeriaMap.svelte` (the `{#snippet nigeriaMap}` block — reused by 3 phases)
  - `src/routes/campaign/+page.svelte` becomes the orchestrator: `$state`, the phase switch, and wiring — same role `+page.svelte` plays today, just thinner.
  - `$lib/game/engine.js` is untouched. This is a pure move + split, not a rewrite — behavior must not change. `engine.test.js` is the safety net.
- `src/lib/components/RegisterGate.svelte`: the registration modal, extracted as-is (same fields, same `/api/register` call, same copy), reused by both `/campaign` and `/city`.
- Footer (Ko-fi, YouTube, "On The Record" link) and the favicon link move into `src/routes/+layout.svelte` so both games get it for free instead of duplicating it.
- No database schema changes — game state for both games is localStorage-only, exactly like today.

## C. The Constituency (city builder)

### Loop

1. Spend from the purse: place a building, upgrade one, or embezzle.
2. End turn → revenue (markets/business/housing IGR) comes in, maintenance is deducted, population grows with housing+jobs (demand grows every turn — standing still loses), satisfaction and scrutiny update, a small seeded event may fire.
3. Run ends at turn 12 (one 3-year term), or early on an EFCC conviction. Running out of money doesn't hard-end the run — it just means no more building until revenue recovers.
4. Verdict card: ending + score from final satisfaction × delivery × integrity, in the campaign game's Legacy style (e.g. *"Father of the Constituency"*, *"Contract Chairman"*, *"Yahoo Governor in Kirikiri"*).

### Map

- 8×8 seeded terrain grid. Tile types: `town_centre`, `residential`, `slum`, `farmland`, `riverside`, `scrub`. Terrain modifies build cost and/or effect per building type (e.g. water buildings cheaper/stronger on `riverside`; land premium on `town_centre`).
- Adjacency matters: a building not connected to a `road` tile (within 1) runs at reduced effect ("abandoned project"); some pairs have bonuses (school next to housing) or requirements (transformer must be within 2 tiles of a power source to do anything).
- 12 building types across sectors: water (borehole, water works), power (solar mini-grid, transformer), health (clinic, hospital), education (school), roads (road), security (police post), housing (housing estate), jobs (market, SME/business hub).
- Rendering: `src/lib/components/city/CityMap.svelte` — CSS 3D isometric grid (`transform: rotateX(55deg) rotateZ(45deg)`, each building a small extruded block from 3 divs). No new dependency. Rotate-90°/zoom controls; no free camera orbit (the accepted limit of doing this in CSS — a true-3D rewrite of just this component is the upgrade path if orbiting turns out to matter).
- Interaction is **one path on all devices**: tap a building in the palette → legal tiles highlight, illegal ones dim with a reason → tap a tile → a preview panel shows cost, terrain modifier, and adjacency effects → confirm. No HTML5 drag-and-drop.

### Scrutiny / embezzlement

`embezzle(run, amount)` moves budget to a tracked total and raises a scrutiny meter. Stages: *whispers* → *press investigation* (satisfaction hit) → *EFCC probe* (funds frozen for a turn) → *conviction* (run ends in disgrace, regardless of score). Delivering well bleeds scrutiny down slowly, so it's a real risk/reward curve rather than a button you simply never press.

### Engine contract (`src/lib/game/city/`)

Same shape as the campaign engine: pure functions, `{ ok: true, run }` / `{ ok: false, error, run }` results, JSON-clone for immutable updates, seeded RNG. Reuses `hashString`/`rng` from `../engine.js` (already public, pure utilities — not gameplay coupling) rather than duplicating them.

Files: `rulebook.js` (params/tuning), `terrain.js` (grid gen), `buildings.js` (catalog), `sim.js` (`resolveTurn`), `engine.js` (public API), `sim.test.js` / `engine.test.js` (vitest, mirrors `engine.test.js`'s style).

**Public API** (`src/lib/game/city/engine.js`):

```js
export const buildingCatalog;  // { [id]: { label, blurb, sector, cost, maintenance, icon? } } — palette reads this
export const tileTypes;        // { [type]: { label, colorClass/fill } } — map reads this

createCityRun({ playerName, constituencyName, seed? })
  -> { ok: true, run } | { ok: false, error }

previewPlacement(run, buildingId, x, y)
  -> { ok: true, cost, sectorEffect, terrainNote, adjacencyNote } | { ok: false, reason }
  // read-only — powers the tap-to-place confirm panel, no mutation

placeBuilding(run, buildingId, x, y)
  -> { ok: true, run } | { ok: false, error, run }

embezzle(run, amount)
  -> { ok: true, run } | { ok: false, error, run }

endTurn(run)
  -> { ok: true, run }   // resolves revenue/maintenance/growth/satisfaction/scrutiny/events;
                         // sets phase: 'complete' + run.ending at turn 12 or on conviction

saveCityRun(run) / loadCityRun() / loadCityHistory()
  // localStorage keys: 'your-excellency-city-current', 'your-excellency-city-history'
  // (distinct from the campaign game's keys — no shared save data)
```

**Run state shape** (what the UI renders):

```js
{
  id, seed, playerName, constituencyName,
  turn,              // 1-based, up to rulebook.params.turns (12)
  phase,             // 'playing' | 'complete'
  budget,            // naira available to spend
  lastTurnRevenue,   // for a "this turn" readout
  grid: { size, tiles: [{ x, y, type, buildingId: string|null }] },
  sectors: {
    water: { supply, demand }, power: {...}, health: {...}, education: {...},
    roads: {...}, security: {...}, jobs: {...}, housing: {...}, sanitation: {...}
  },
  population,
  satisfaction,      // 0-100
  scrutiny,           // 0-100
  scrutinyStage,     // 'none' | 'whispers' | 'press' | 'probe' | 'conviction'
  embezzledTotal,
  history: string[],
  ending: null | { title, score, summary }
}
```

### UI (`src/routes/city/+page.svelte`, `src/lib/components/city/`)

- `CityMap.svelte` (grid + placement interaction), `Palette.svelte` (building picker, reads `buildingCatalog`), `TurnBar.svelte` (budget, turn, satisfaction, scrutiny meters), `Verdict.svelte` (ending card).
- Same visual language as `/campaign` (own local `card`/`btn`/`field` Tailwind class strings — matches the existing per-file pattern rather than introducing a new shared CSS layer all three route files would need to coordinate on).
- Shares `RegisterGate.svelte` and `PlayerCount.svelte` from piece B/A.

## Explicitly out of scope (v1)

- Demolishing/relocating buildings.
- Free 3D camera orbit (CSS 3D limit, noted above).
- Any link/unlock between the two games — fully separate saves and progress.
- Multiplayer or shared/competitive constituencies.
