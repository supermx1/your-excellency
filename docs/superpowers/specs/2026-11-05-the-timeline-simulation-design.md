# "The Timeline" — what-if history simulation of Nigeria

Date: 2026-11-05 · Status: draft for review

The route and several details below are marked **(my call)**: decided by Claude during design, not by the owner. Everything else was agreed in conversation.

## Intent

The owner runs The Average Tech Dad YouTube channel and wants to make videos in the style of SIMULATED's *"I Let a World of Geniuses Evolve for 3,000 Years"*, about Nigeria: "What if Nigeria was never colonized?", "What if Nigerians had 200 IQ?". The same tool is a third game on the Your Excellency site, so viewers can replay the run from a video and try their own.

What made the reference video work, and what this must reproduce:

- **One switch, everything else real.** Same volcanoes, plagues and human nature; only the chosen thing changes.
- **Two timelines side by side.** "In 586 they have steam engines. In our world, not until 1712."
- **Measurable outcomes.** Wars and deaths, states rising and falling, invention dates, population, literacy, life expectancy.
- **Recurring families** whose descendants we meet again across centuries.
- **Runs that differ.** The creator ran 50 versions; outcomes vary because people are unpredictable.

It sits between a toy and a real simulator: grounded in real data and roughly reproducing real Nigeria when no switch is changed, but honest that it is a model telling one possible story.

## Goals (first version)

1. A third card on the hub (`src/routes/+page.svelte`), next to The Campaign and The Constituency, opening the new game. Same neo-brutalist shell, footer and registration gate as the other two.
2. Two featured scenarios: **Never colonized** (starts 1850) and **200 IQ** (start year chosen by the player). Each opens the switch menu pre-filled; the player can change any switch before pressing Run.
3. A **general switch menu**: the engine never changes per question; a scenario is only switch values plus a start year.
4. A **simulation engine in plain JavaScript**, structured the way Mesa is, running in the viewer's browser.
5. A **data pipeline** that downloads and cleans real data once, at build time.
6. **Visuals:** a 3D diorama of Nigeria as the main view, and a "Two Nigerias" split screen for key years and the ending.
7. **3–4 fictional families** followed across generations.
8. **Narration** written by Workers AI (free allocation), with built-in fallback narration, editable by the owner.
9. **Saved runs with share links**; the owner's video runs are marked featured.
10. **Live mode** the owner screen-records with their own voice.
11. **Export mode**: a saved run rendered to MP4 on the owner's Mac with HyperFrames and a free on-device AI voice.

## Non-goals (first version)

- The free-text "type any what-if" box. It comes next: an AI turns the question into switch values, shows them, the player adjusts. The switch menu is designed so this can be added without engine changes.
- MP4 export for visitors (could later run in the browser).
- Vertical 9:16 Shorts clips (owner chose 16:9 only for now).
- Simulating the rest of the world. The outside world (world wars, oil prices, global inventions, pandemics) is fixed real history.
- Visitor accounts or sign-in; multiplayer; editing the model in the browser.

## Anti-goals (my call — the owner did not weigh in)

- **Same rules for every group and every faith.** Religion is simulated (see below) because it shaped Nigeria, but no ethnic group or faith gets its own rules or traits. Differences come only from geography, starting data, institutions (schools, laws, state religion), the chosen switches and chance. Switches like "learning speed" or "religious tolerance" apply to everyone in the simulated Nigeria.
- No presenting runs as predictions or fact. Copy and narration say "in this run".
- The AI never decides outcomes. The engine decides; the AI only writes words about what the engine produced.
- No real living people as characters.
- Nothing that breaks or slows The Campaign or The Constituency, or eats their share of the AI allocation.
- No heavy downloads: no Pyodide/Python; data files stay small. Much of the audience is on phones with paid data.

## Constraints

- **Stack:** SvelteKit (Svelte 5), JavaScript with JSDoc, Tailwind v4, pnpm, vitest, Playwright, prettier. Three.js 0.174 is already a dependency. Use the Svelte MCP autofixer on Svelte code, per `CLAUDE.md`.
- **Hosting:** the existing Worker in `wrangler.jsonc` (D1 `fantasy-naija`, KV `AI_CACHE`, `AI` binding, domain `yx.techgfxlimited.com`). The owner says this is on The Average Tech Dad Cloudflare account; confirm with `wrangler whoami` before deploying. The project has a Wrangler config, so use Wrangler.
- **Workers Free CPU limit is 10 ms per request.** All simulation runs in the browser (in a Web Worker). Server routes only save and load runs and call the AI.
- **Workers AI free allocation: 10,000 neurons/day, account-wide, resetting 00:00 UTC.** The Campaign's policy simulator (`src/lib/server/policy-sim.js`, `@cf/meta/llama-3.2-3b-instruct`) shares it. Rough cost: narrating one run ≈ 350 neurons; about 25 new narrated runs a day.
- **Reuse, don't couple:** `hashString` / `rng` from `src/lib/game/engine.js` are fine to import (the city game already does). Engine, state and storage are separate from the other two games, as with The Constituency.
- **Data licences:** credit every source on an attribution page (Our World in Data / Maddison / World Bank are CC BY; check HYDE, UCDP, historical-basemaps (GPL-3) and the Murdock map terms before shipping derived files).

## How it works

### Engine (decided: plain JS, Mesa-like)

- `src/lib/game/sim/` (path my call). A **Model** holds the year, a seeded RNG, the agents and a **data recorder**; each yearly **step** runs agents' rules in a fixed order. **Agents** are polities and families. Cells (land) hold population and economy. No framework dependency.
- **Yearly steps** from the start year to 2025. A run can then continue to 2100 **(my call)**; "ours" past 2025 is the UN World Population Prospects projection.
- **Randomness:** every new run gets a new random seed, so outcomes differ. A saved run is stored with its seed, switches and engine version, so it replays identically for recording and export. Featured runs also store their full recorded output **(my call)**, so they survive later engine changes.
- **Runs in a Web Worker** so the 3D view stays smooth. One 175-year run of the spike model took ~5–30 ms, so a full model running many times in the background is realistic.
- **"Ran it 50 times":** after a run, the browser runs ~50 more seeds with the same switches in the background and reports distributions ("in 41 of 50 runs there was a civil war").

### What is simulated

- **Cells:** the land is the 37 present-day state shapes from `@svg-maps/nigeria` **(my call — coarse; the upgrade path is LGAs or a hex grid)**. Each cell has population, urban share, literacy, life expectancy (from mortality), income per head by sector (farming, trade/industry, oil once discovered), infrastructure (rail/roads/power) and conflict damage.
- **Religion:** each cell holds population shares of Islam, Christianity and traditional religions. Shares change through contact and trade, schools tied to a faith (Quranic schools, mission schools), a polity's state religion, migration and conquest. Religious difference adds tension between and within cells and polities, scaled by the tolerance switch, and can feed into wars, riots, insurgencies and secessions; tolerance and shared prosperity lower it. Every faith runs the same rules: what a faith brings comes from its institutions (for example, schools that teach reading), never from the faith itself. Literacy counts reading in any script, Latin, Arabic or Ajami (my call), with official school literacy tracked separately so the real-data comparison stays like for like.
- **Polities** own sets of cells: capital, government type, treasury, army, stability, tech knowledge, policies. They trade, fight, merge, split, federate, and adopt technology. In "never colonized" the 1850 map starts as: Sokoto Caliphate, Borno, the Yoruba states after Oyo, Benin, Igala, Igbo communities, Delta/Cross River city-states, and the Middle Belt peoples (cell assignment hand-authored, as in the mockup).
- **Technology:** a list of real inventions with their real world dates. A polity imports a technology some years after it exists in the outside world (lag depends on trade, literacy and contact), or invents it itself when its knowledge and learning speed are high enough (the 200 IQ case: "steam engine in Kano, 1870 — in our world, Nigeria's first railway came in 1898–1901"). Technologies change mortality, productivity, war and growth.
- **Events, two kinds:**
  - *Real-history events* (switchable): Lagos annexation 1861, Royal Niger Company 1886, Benin expedition 1897, Sokoto conquest 1903, amalgamation 1914, independence 1960, oil at Oloibiri 1956, civil war 1967–70, the coups (1966 ×2, 1975, 1983, 1985, 1993), state creations (1967, 1976, 1987, 1991, 1996), SAP 1986, Christian missions arriving from 1842 (Badagry), Sharia law in 12 northern states (1999–2001), the Boko Haram insurgency (2009–), and so on. Each fires only if its preconditions hold in this run (no "civil war 1967" if there is no Nigeria).
  - *Always-real events* (not switchable): droughts (1913–14, 1972–74, 1983–84), epidemics (1918 flu, meningitis, cholera, HIV, Ebola 2014, COVID 2020), world wars, oil prices, the global technology frontier. Their strength is fixed; their effect depends on the run (as in the video, where the same plague hit a printing, ocean-sailing world).
  - *Emergent events* from the engine's own rules: wars, coups, secessions, unions, famines, booms — chance weighted by conditions.
- **Families:** 3–4 lineages placed in different cells (e.g. Kano, Ibadan, Onitsha, Calabar). A new generation roughly every 25 years; each member's life (schooling, occupation, migration, war, early death) is drawn from their cell's conditions. Names come from the cell's language (Hausa, Kanuri, Yoruba, Edo, Igbo, Efik/Ijaw lists).
- **Calibration:** the "baseline" run (no switches changed, from 1850) must roughly reproduce real Nigeria — population 1900–2025, literacy, life expectancy and urban share — within tolerances agreed in the plan, averaged over many seeds. This is the quality bar that separates it from a toy.

### Switch menu (first version)

Generic switches, each with a short plain-English description; a preset is a named bundle of values plus a start year.

| Group | Switches |
|---|---|
| History | British conquest on/off; amalgamation on/off; independence year; civil war on/off; military coups off / as history / more likely; oil discovery on/off and year |
| People | learning speed ×1–×3 (200 IQ preset = max); health (mortality multiplier); trust between groups (lower conflict chance — applies to everyone equally) |
| Religion (owner asked for religion switches; these four are my call) | religious tolerance low / as history / high (scales religious tension for every faith); Christian missions on/off; state religion: secular / each polity chooses / as history; Sharia in the north on/off (the 1999–2001 event) |
| Land | oil in the ground yes/no; malaria burden; drought severity |
| Policy (from a chosen year) | reliable 24-hour power; free schooling; corruption level |
| Start | start year, 1850–2025 (my call: no earlier, because 1850 is the earliest starting map and data before it is too thin) |

The outside world is not switchable in v1.

### Screens

1. **Hub card** "The Timeline" (owner's choice) → `/sim` (my call).
2. **`/sim`**: the two featured scenarios and a gallery of featured runs.
3. **Setup**: switch menu (pre-filled by a scenario or blank), start year, Run.
4. **Live view**: 3D diorama, big year counter, stats with the real value beside each ("ours: …"), event captions, family cards, speed controls (pause, slow, fast-forward through quiet years), jump to year, camera controls. Key years switch to Two Nigerias automatically; the player can toggle it.
5. **Ending**: final Two Nigerias comparison (population, can read, life expectancy, wars, biggest city, religious mix), the 50-run summary, share link, run again.

In the design session the owner picked the 3D diorama and Two Nigerias over a flat full-screen map.

### Visuals

- **3D diorama** (Three.js): extruded state shapes, polity colours, borders that animate as polities change, cities as glowing towers sized by urban population, war pulses spreading across fronts, plagues spreading along trade routes. An automatic camera director moves to events; shot choices are data (so export can reuse and the owner can adjust them).
- **Two Nigerias:** left side is **real recorded data** (real borders and real numbers), not a simulated baseline (my call); right side is the run. Real borders come from hand-authored snapshots (my call): 1850, 1861, 1885, 1900, 1906, 1914, 1960, then the 12/19/21/30/36-state changes of 1967, 1976, 1987, 1991 and 1996.
- **One renderer for live and export:** the diorama draws everything from (run data, time). Live mode feeds it wall-clock time; export feeds it the renderer's frame time. This is what makes exports match what was seen live.
- A lower-detail mode for phones.
- The Constituency's Three.js code (`src/lib/components/city/three/`) can be looked at for patterns but is not shared.

### Narration and AI

- Workers AI writes per-era narration and family vignettes from the run's recorded events (batched, not per year), cached in `AI_CACHE` by run.
- **Budget guard:** a daily neuron counter in KV with a cap below the free allocation that leaves room for The Campaign. When it is reached, new runs get built-in template narration (same fallback idea as `policy-sim.js`).
- The owner can edit the narration of featured runs; visitors cannot edit in v1. Owner-only actions (mark featured, edit narration) reuse the `/admin` password gate (`ADMIN_PASSWORD` Cloudflare secret, see `src/routes/admin/+page.server.js`).
- Narration is in English (my call).
- Model choice is left to the builder within the budget (the Campaign already uses `@cf/meta/llama-3.2-3b-instruct`).

### Saving and sharing

- D1 table (new migration) for runs: id, created, engine version, seed, switches, preset, start/end year, title, featured flag, owner-edited narration, final summary, and for featured runs the full recorded output.
- Share link `/sim/run/[id]` replays the run. Saving is the only write; running needs nothing from the server.

### Export (owner only, on the Mac)

- A local script (e.g. `pnpm sim:export <runId>`, my call) builds a **HyperFrames** project for a saved run: the time-driven diorama page (drawing from `hf-seek` event time), the run data bundled in, captions, family cards, split screens, the ending, and narration audio.
- **Voice:** `npx hyperframes tts` (Kokoro, on device; needs Python 3.10+ and `kokoro-onnx`). Narration audio lengths set the timing of captions and scenes. No AI allocation is used.
- Render with the HyperFrames CLI to MP4: 16:9, 1080p with a 4K option. Video length follows the run and its narration; the export lets the owner pick the years and moments to include. Use the `hyperframes`, `hyperframes-core`, `hyperframes-animation` (Three.js adapter) and `hyperframes-cli` skills when building this.

### Data pipeline

Scripts in the repo (e.g. `scripts/sim-data/`, my call) download raw files into a gitignored cache, then write small cleaned files the game ships with (my call: under ~1 MB gzipped in total, loaded only on the `/sim` pages). Pre-1950 Nigerian numbers are mostly estimates; say so on the attribution page.

| Need | Sources |
|---|---|
| National series 1800–today (population, life expectancy, literacy, GDP per head, urban share, electricity, oil output) | Our World in Data chart CSVs (`/grapher/<slug>.csv`), drawing on Maddison 2023, Gapminder, Clio Infra; World Bank API (1960+) |
| Future "ours" | UN World Population Prospects (to 2100) |
| Where people lived, 1850–2023 | HYDE 3.3 gridded population (urban/rural), aggregated to the 37 cells |
| Modern state-level detail | DHS (state literacy, mortality), NBS, census 1991/2006 |
| Religion by place | DHS (respondents' religion by state), 1952–53 and 1963 census religion by region, Pew / World Religion Database national shares; the 1850 starting shares hand-authored from histories |
| Conflicts | UCDP GED (1989+), Correlates of War (1816+, verify), Wikipedia lists for 19th-century wars |
| 1850 polities and old borders | Murdock ethnographic map (Nunn's digitisation), historical-basemaps; final 1850 cell assignment hand-authored |
| Real event catalogue | Wikipedia timeline of Nigerian history (MediaWiki API) + hand curation with sources; EM-DAT for disasters needs registration |
| Technologies | Wikidata invention dates (P575) + Wikipedia invention timelines; Nigeria's real arrival dates curated by hand |

### Testing

- vitest: same seed → identical run; different seeds → different runs; each switch measurably changes what it should (e.g. conquest off → no amalgamation event, Nigeria may never form; higher religious tolerance → fewer religion-driven conflicts); swapping which faith is where in a test map gives mirrored results (same rules for every faith); baseline calibration within tolerance across seeds; budget guard and fallback narration.
- Playwright smoke: hub card → scenario → run reaches 2025 → ending shows.
- Export: one short featured run renders to MP4 with voice.

## Left to the builder

Exact equations and parameter values, data-cleaning details, the narration prompts and model, Three.js implementation, the HyperFrames composition structure, file and route names marked "my call", and the order of work (the plan should land the engine, data and baseline calibration before the visuals and export).

## Addendum (2026-11-06): globe opening and neighbouring countries

Agreed in conversation after Plan 3:

- **Globe opening.** A run opens on a slowly turning, stylised Earth in dark space with a year title card; the camera swings to West Africa and dives in, and the globe hands over to the 3D diorama at the same place and size; then playback starts. Skippable. About 6 seconds.
- **Globe closing.** When a run ends, the camera pulls back out to the globe behind the ending comparison.
- **Not a globe-wide simulation.** The simulation and the diorama stay as they are; the globe is for the opening and closing shots only (readability and phone performance).
- **Stylised globe, light data.** Country outlines from public-domain Natural Earth data drawn onto the globe at runtime; no photo textures (several MB). Nigeria highlighted.
- **Neighbours on the diorama (my suggestion, accepted).** Benin, Niger, Chad, Cameroon, the sea and the Gulf of Guinea coastline drawn dimmed around Nigeria, so Nigeria no longer floats alone and the globe hand-off is seamless.
- **Export-ready.** The intro and outro camera are pure functions of playback time like the rest, so Plan 4's export reuses them.
- Setup page: the end year is now typed (up to 2100), replacing the "Continue to 2100" checkbox.
