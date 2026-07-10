# PRD: Fantasy Naija — A Nigerian Political Simulator

**Status:** Draft v1 · partially implemented (see §0A) · **Owner:** Emeka · **Last updated:** 5 July 2026
**Target implementer:** A small/mid coding model (e.g. Claude Haiku / Workers AI) working from this doc alone.

---

## 0. TL;DR for the implementer

Build a turn-based, single-player political simulation game set in Nigeria. **The premise: try to be a good leader when the entire system — godfathers, riggers, insecurity, the bribe economy — is engineered to stop you.** The player runs a campaign, makes legitimate-vs-corrupt choices, wins or loses an election, proposes one policy, and survives (or doesn't) a tribunal challenge. Corruption is fully playable, but it is framed as the **obstacle the game is about**, not the point of it — the score rewards good leadership (see §1A and §5.11). Game rules are grounded in a **versioned, editable rulebook** derived from the Nigerian Constitution and Electoral Act 2022, so the game stays accurate as laws change.

**Stack (committed):** SvelteKit (`adapter-cloudflare`) → Cloudflare Pages + Workers · **D1** for game state · **KV** for the cached rulebook and cached AI responses · **Workers AI** for the policy-reaction engine, behind a provider interface so it can swap to the Anthropic API. Everything runs on the free tier if the caching rules in §7 are followed.

**Build it in this order:** Milestone A (schema + deterministic game loop, no AI) → Milestone B (AI policy simulator + caching) → Milestone C (rulebook ingestion + admin) → Milestone D (tribunal + events polish). Each milestone is independently testable.

---

## 0A. Implementation status & deviations from v1 spec

**Last verified against the shipped, deployed build: 5 July 2026.** The build has intentionally diverged from parts of this v1 spec — changes directed during development. **Where this section conflicts with an older passage, this section wins**; the affected passages below are annotated inline.

**Deviations from the original spec:**

1. **National presidential race, not one LGA-chair state.** The biggest change: v1 ships the whole country — a **presidential run across all 36 states + the FCT**, on a real SVG map of Nigeria coloured by projected win/loss. This supersedes the §3.3 non-goal ("one playable state"), the §5.1 `lga_chair` role, and the §14 "which single state ships first" question. Granularity is **state-level** (37 units); sub-state (774-LGA) fidelity stays out of scope.
2. **Character builder.** Setup now includes **Background/Career, Wealth, and Scandal history**, which set starting stats (war chest, popularity, connections, integrity, EFCC risk) via a shared `startingProfile()` used by both the engine and a live UI preview. Extends §5.1.
3. **Religion & state-of-origin sentiment.** The player picks a **religion and home state**, which apply a modest support lean — a home-state turnout edge plus a co-religious / cross-religious bloc lean — modelling documented bloc voting. A *lean, never a lock*, framed per §9A. See the §9 addendum.
4. **Money is player-controlled and dynamic.** Campaign actions take a **spend level** (small/medium/large, scaling both cost and effect), and the godfather's offer is a **per-week dynamic amount**, not a fixed constant. Refines §5.2.
5. **Soft-registration lead capture (new; PII).** Players browse the setup freely, but starting a run opens a one-step gate collecting **name, email, and country** behind a consent checkbox, stored in a D1 `leads` table. Not in the original spec — see the §9 addendum for its privacy requirements.
6. **Neobrutalist design system** and an in-game "How to play" panel were added for clarity; a launch/brag video was produced.

**Status by milestone (see §13):**

- **Milestone A — deterministic core:** ✅ built — setup, character builder, AP/turn economy, national vote maths with insecurity turnout-suppression, rigging + detection, the full election → policy → tribunal → Legacy loop, clean twins, noble-loss carry-over, save/load.
- **Milestone B — AI policy simulator:** ✅ built — `/api/policy` runs the §8 provider interface (Workers AI `@cf/meta/llama-3.2-3b-instruct` via JSON-mode schema, or Anthropic when `AI_PROVIDER=anthropic` + key secret), grounded with rulebook provisions + national insecurity, KV-cached (`AI_CACHE`, 30-day TTL, hash of policy+provision ids), strict-validated, deterministic fallback on any failure. *Note: the PRD's `llama-3.1-8b-instruct` default was deprecated 2026-05-30.*
- **Milestone C — living rulebook:** 🟡 partial — the **rulebook admin (Path 1) is shipped at `/admin`, backed by D1 + KV** (edits take effect for new runs with no redeploy, per §5.7). Document-upload assist (Path 2) is not built.
- **Milestone D — governing clock / events / endings polish:** 🟡 partial — the tribunal exchange and Legacy **endings** are in; the term clock, result-lag queue, and event / EFCC / defection engine are not.

---

## 1. Problem statement

There is no political game built for a Nigerian audience that treats Nigerian political *reality* — godfatherism, defection, rigging-and-tribunal cycles, subsidy politics, and above all **insecurity** (banditry, insurgency, communal and separatist violence) and its effect on turnout, sentiment and legitimacy — as the actual mechanics rather than reskinned Western civics. Existing references like Fantasy Parliament are prediction/media games about Westminster; they don't let you *play* the system. The cost of not building it is a missed, culturally-specific product opportunity in a large, politically-engaged, mobile-first market that Emeka already understands and builds for.

## 1A. Premise, tone & design pillars (read this before building anything)

**This section governs the whole document.** Every mechanic below is in service of one premise, and any implementation choice that contradicts it is wrong even if it technically satisfies a requirement.

**Premise.** You are trying to be a *good leader* in a system built to prevent it. Godfatherism, rigging, the bribe economy, and insecurity are not the "fun toys" of the game — they are the **antagonist**. The fantasy on offer is not "act like a corrupt Big Man"; it is **"reform a broken system without being consumed by it."**

**The player still chooses their path.** The corrupt route is fully playable — this is not a morality-on-rails game. But the game is *pointed*: money and raw power are **means, never the win condition**, and the scoring (§5.11) makes good leadership the true high-score path. A player can get rich and entrenched and still reach a hollow, reviled ending.

**The core tension (why it's a game, not a lecture).** The system genuinely rewards corruption in the *short* term — the godfather backs whoever plays ball, and a clean candidate can lose to a rigger. So the player constantly weighs the real dilemma of reform: *compromise a little to win and then do good (and carry the stain), or stay clean and risk handing power to someone worse?* Sainthood is **not** an auto-win, and virtue is **not** free. That friction is the game.

**Difficulty stance (decided): the honest middle.** A fully clean victory is **possible but hard** — a skilled player who plays it straight *can* win, and the game respects and rewards that. But holding power almost always tempts *some* compromise, and the game never pretends clean play is easy or guaranteed. Not "corruption is mandatory" (too cynical); not "virtue always wins" (a fairy tale). Reform is winnable against the odds.

**Design pillars (use these to arbitrate any ambiguity):**
1. **Good leadership is the goal.** The headline score is what you did *for citizens and institutions*, not what you accumulated.
2. **Every dirty option has a clean, harder twin** (§5.11). The player always has a legitimate path; it just costs more and risks more.
3. **The satire punches up, never down.** The targets are godfathers, riggers, the entrenched class — never ordinary Nigerians, and never "Nigeria" as an idea. See §9A.
4. **Consequences over sermons.** The game never lectures. It lets citizen voices, outcomes, and endings (§5.11) deliver the meaning — including letting the corrupt path play out to an epilogue that *feels* empty rather than blocking it.
5. **Made from inside the culture.** The point of view is the reformer and the citizens, dramatizing a lived Nigerian frustration: the system is rigged against good people, and trying anyway is the heroic act.

## 2. Goals

1. **Ship a complete, replayable single-player loop** (create identity → campaign → election → policy → tribunal → outcome) that a new player can finish in **under 20 minutes**.
2. **Ground the simulation in real, current Nigerian law** such that a provision change (e.g. an amended Electoral Act section) can be reflected in-game by **editing data, with zero code deploy**.
3. **Run at near-zero cost on the edge** — stay inside Cloudflare's free tier for a solo developer's testing and early users (target: **$0/month** through beta).
4. **Make the AI layer swappable** — the same game must run on Workers AI (free/edge) or the Anthropic API (higher quality) via one config change.
5. **Be deterministic enough to test** — every non-AI outcome (vote maths, rigging-detection rolls) is reproducible from a seed, so the implementer can write assertion-based tests.
6. **Make good leadership the win condition** — the game's top-line **Legacy score (§5.11)** rewards improving citizens' lives, integrity, and genuine trust far above wealth or power, so the intended fantasy (reform against the odds) is the one the mechanics actually reward. Success measure: in playtests, the clean path is *understood by players to be the high-score path* even though the corrupt path is easier short-term.

## 3. Non-goals (explicitly out of scope for v1)

1. **Multiplayer, leagues, or real-time PvP.** Huge complexity jump (sync, matchmaking, anti-cheat). v1 is single-player career mode only. *Design the schema so a `match_id` can be added later, but build none of it.*
2. **Real, named living politicians as characters.** Avoids defamation/impersonation risk and keeps content generation safe. Use fictional archetypes and party *acronyms* only. (See §9 Safety.)
3. **Full 774-LGA data fidelity.** *(Partly superseded — see §0A: v1 now ships all 36 states + FCT at **state** granularity, not one state.)* **Sub-state (LGA / ward) geodata** remains out of scope for v1 — a P2 data-entry task, not an engine change.
4. **Mobile-native apps.** v1 is a responsive web app (SvelteKit). PWA/native is future.
5. **Legal accuracy as authoritative advice.** The rulebook is a game abstraction of the law, not legal reference. A visible disclaimer states this.
6. **Web scraping of legal sources as the primary update path.** Fragile and maintenance-heavy; supported only as an assisted P2 helper (see §6).

## 4. User stories

**Player (core)**
- As a new player, I want to pick a state, a starting role, and a party (or found my own) so that I have a political identity to play.
- As a player, I want to spend a fixed budget of time/money/influence across campaign actions so that I can raise my standing before an election.
- As a player, I want to choose between clean campaigning and corrupt shortcuts (bribery, rigging), each with visible risk/reward, so that I face real strategic tension.
- As a player on election day, I want to react to a short sequence of events and see my legitimate vote total, so that outcomes feel earned.
- As a player who wins narrowly, I want an opponent to be able to challenge me at a tribunal that I must defend, so that winning isn't the end of the game.
- As a player in office, I want to propose one policy and see how different Nigerian demographic groups react, so that governing has consequences.
- As a player, I want to be able to pursue good leadership — clean funding, real delivery, honest turnout — and be **rewarded for it with a higher score** even if I stay poor, so that the game's incentive matches its premise.
- As a player, I want every corrupt shortcut to have a visible clean alternative (harder, slower), so that playing with integrity is always a real option I'm choosing.
- As a player who plays clean and still loses, I want that principled loss to *mean something* mechanically, so that I'm not punished for refusing to cheat.
- As a returning player, I want my run's result saved so that I can start a new run or see my history.

**Edge / error stories**
- As a player who runs out of money mid-campaign, I want remaining corrupt options greyed out with a reason, so that the constraint is legible.
- As a player, if the AI reaction service is unavailable, I want the policy step to still produce a plausible result (fallback), so that the game never dead-ends.
- As a player, I never want to see content that sexualizes anyone, targets a real named person, or otherwise violates the safety rules in §9.

**Admin (Emeka)**
- As the admin, I want to add or amend a rule provision (title, text, tags, effective date) through a protected screen so that the game reflects a legal change without a deploy.
- As the admin, I want to bump a document to a new **version** and mark provisions superseded, so that the game can reason about "the law as of date X."
- As the admin, I want to optionally upload an official PDF and have it parsed into draft provisions I then review, so that entering long documents is faster.

## 5. Requirements

Priorities use MoSCoW: **P0 = must-have (no ship without it)**, **P1 = fast follow**, **P2 = future / architectural insurance**.

### 5.1 Identity & setup — P0
The player creates a run: choose a **character background** (career, wealth, scandal — sets starting stats), a **religion and state of origin** (each applies a sentiment lean — see §0A and the §9 addendum), and a `party` — join a seeded party (acronyms e.g. **APC / PDP / LP / NNPP**, treated as fictional labels) or **found a party** by meeting a simplified INEC-style requirement (member threshold + spread), drawn from a rulebook provision. *(Scope note: v1 runs a **national presidential** race across all 36 states + FCT, not a single-state `lga_chair` seat — see §0A. The founding-threshold and vote maths below now operate per state.)*

- **Acceptance (Given/When/Then):**
  - Given the setup screen, when the player founds a party below the member/spread threshold, then registration is refused with the specific unmet requirement shown (sourced from the referenced provision id).
  - Given a completed setup, when the run starts, then a `players` row and a `game_state` row exist with `naira`, `popularity`, `connections`, `efcc_risk` initialised to the configured defaults.

### 5.2 Campaign loop — P0
A fixed budget of **campaign turns** where **1 turn = 1 game-week** (default **6 weeks** in v1). **Time is a first-class resource, distinct from money:** each turn grants a pool of **action points (AP)** (default **5**), and every action costs both **AP (`ap_cost`)** and naira/currency. When AP reaches 0 the turn advances; `rest` ends a turn early by choice. The action set — `rally`, `media_buy`, `ground_game`, `court_traditional_ruler`, `godfather_deal`, `rest` — each has a defined AP + currency cost and an effect on the currencies and on a per-LGA `support_index`. The scarcity is deliberate: you cannot campaign in every LGA, court every godfather, *and* fund the ground game before polling day — you must triage, and triage is where character shows. (Full time model — term clock, result-lag, optional timer — is §5.12.)

- Vote potential per LGA is a **pure function**: `base_votes = registered_voters * effective_turnout * loyalty_index`, then modified by accumulated `support_index`. **`effective_turnout` is suppressed by insecurity** (see §5.10): `effective_turnout = base_turnout * (1 - k * insecurity_index/100)`. All inputs come from D1; the function is deterministic given the run's seed.
- The **godfather_deal** action creates an obligation record (a future demand). Refusing/reneging later reduces `connections` and support in that godfather's LGAs.
- **Acceptance:**
  - Given identical seed + identical action choices, when the campaign is replayed, then final currency values and `support_index` per LGA are **identical** (deterministic — testable).
  - Given insufficient naira for an action, when the player selects it, then it is rejected and the currency is unchanged.
  - Given a turn whose remaining AP is less than an action's `ap_cost`, when the player selects it, then it is rejected for **insufficient time** — independent of how much naira they hold (time is scarce on its own).
  - Given AP reaches 0, when the player has acted, then the turn advances automatically and AP resets to the per-turn pool.

### 5.3 Election day & corruption mechanics — P0
Polls resolve into `votes_legitimate` per candidacy from §5.2. The player is offered a bounded set of **rigging actions** (v1: `inec_bribe`, `ec8_forgery`, `intimidation`) each with a naira cost, a `votes_gained` value, and a **detection probability** computed by a pure `calculateRiggingDetection(action, context)` function.

- Detection uses a **seeded RNG roll** against the computed probability → reproducible. On detection, apply a defined consequence per `detection_source` (popularity hit, EFCC-risk increase, or a tribunal-evidence flag on the opponent).
- **Insecurity lowers detection risk** (see §5.10). `context` includes `low_observer_access` and `inec_could_not_deploy`, both raised by a high `insecurity_index` in the target LGA — so manipulating votes in insecure areas (typically an opponent's suppressed stronghold) is cheaper and safer. This is the game's grim-but-accurate core tension: state failure rewards the manipulator.
- The final official total = `votes_legitimate + votes_rigged`. Winner is the higher official total.
- **Optional election-day timer (non-core, OFF by default):** the election-day event sequence MAY show a soft, cosmetic per-event countdown for "war room" tension. It is player-toggleable, **never a fail state** (a timeout defers / no-ops the choice, it never causes a loss), and is **disabled in deterministic tests**. This is the *only* place real-world time pressure is permitted, and it must not affect outcomes — see §5.12.
- **Acceptance:**
  - Given a fixed seed and a rigging action with probability p, when election day resolves, then detection outcome is deterministic and re-running yields the same result.
  - Given an undetected `inec_bribe`, when results are declared, then the bribed official NPC gains an ongoing `blackmail_risk` liability recorded in D1 (sets up future events).
  - Given the player chooses no rigging, when they trail on legitimate votes, then they lose cleanly and the loss is recorded.

### 5.4 Policy simulator (AI) — P0 (with mandatory fallback)
When in office, the player writes/selects **one** policy (title, sector, scope, description). The system returns per-**demographic-segment** reactions (approval delta, one-line concern in a Nigerian voice, protest probability, social sentiment) plus a summary (net approval, a headline, a trending hashtag, unintended consequences).

- The reaction is produced by the **AI provider interface** (§8). **Before calling the model**, check a cache keyed on a hash of `{policy_text, sector, scope, relevant_provision_ids, segment_set_version}`. Cache hits cost **zero** neurons.
- The prompt is grounded with the **relevant rulebook provisions** (retrieved per §6) **and the current regional insecurity context** (`insecurity_index` + `threat_type`, see §5.10) — security-priority segments react far more to tangible local security than to announcements, so a "security policy" in a high-insecurity region should be judged on `implementation_viability`, not rhetoric. Model output is requested as **strict JSON** and validated against a schema; on invalid JSON or provider error, use the **deterministic fallback** (a rule-based scorer over segment attributes) so the step always completes.
- **Acceptance:**
  - Given a policy already simulated with identical inputs, when re-run, then the cached result is served and **no** model call is made (verify via a call counter).
  - Given the provider returns malformed output or errors, when the policy is simulated, then the deterministic fallback produces a valid result and the UI renders without error.
  - Given a valid model response, when parsed, then it conforms to the `PolicySimResponse` schema (§8) or is rejected in favour of the fallback.

### 5.5 Election tribunal — P1
Loser (an NPC in v1) may file a petition within a rulebook-defined window (Electoral Act post-declaration timeframe). Resolve as a lightweight **evidence-vs-counter** exchange: petitioner's `evidence_score` (higher if rigging was detected in §5.3) vs the player's counters (`legal_spend`, `judge_bribe`, `delay_motion`, `technicality`). Outcome ∈ `{dismissed, nullified, rerun_ordered}`, appealable one level. Judge bribe is a hidden modifier that itself carries a detection roll. **Each appeal level consumes term-turns (§5.12)** — dragging a case upward can eat much of a term, a real strategic cost even when you eventually win.

- **Acceptance:**
  - Given rigging was detected on election day, when a petition is filed, then the petitioner's `evidence_score` is measurably higher than in a clean run.
  - Given a fixed seed, when the tribunal resolves, then the ruling is deterministic.

### 5.6 Events & consequence engine — P1
A small table-driven event system fires between phases (e.g. `scandal`, `protest`, `efcc_watch`). Events read/modify player currencies and `efcc_risk`. When `efcc_risk >= threshold` **and** the player holds no office (no immunity), an `efcc_prosecution` event applies penalties. Defecting to the ruling party is a modelled action that lowers `efcc_risk` (the "cross-carpet, case disappears" mechanic).

### 5.7 The living rulebook — P0 (data) / see §6 for ingestion
All rule-dependent numbers and gates (party-registration thresholds, tribunal windows, immunity conditions, campaign-finance caps) reference **rulebook provisions** by id — never hardcoded constants. Provisions are versioned and effective-dated.

- **Acceptance:**
  - Given the admin edits a provision's numeric value (e.g. registration threshold) and saves, when a new run starts, then the game uses the new value **without a code deploy**.
  - Given a provision is superseded by a new version with an effective date, when the game references "current law," then it selects the version effective on the in-game date.

### 5.8 Admin & persistence — P0
A password-protected admin screen for rulebook CRUD (see §6). A single-player **save/load** so a run persists and a player can view past results.

### 5.9 Future considerations — P2
Multiplayer & leagues · full state/LGA geodata · semantic provision retrieval via **Vectorize** embeddings · voice/animated leaders · richer godfather negotiation tree · in-app document-upload parsing for the rulebook. *Schema must not block these (foreign keys and nullable `match_id` prepared).*

### 5.10 Insecurity — regional threat system — P0-lite core, P1 full
Insecurity is the defining fact of contemporary Nigerian politics and is modelled as a **first-class, regionally-typed state variable** that flows through turnout, campaigning, rigging, incumbent approval, and the policy simulator. It is **not** flavour text.

**Split by priority so it doesn't bloat the MVP:**
- **P0-lite (ship in Milestone A):** an `insecurity_index` (0–100) + `threat_type` per LGA, and its **turnout-suppression** effect on the vote maths (§5.2). Cheap, deterministic, and it immediately makes geography matter.
- **P1 (Milestones C/D):** campaign friction & disruption events, the rigging synergy (§5.3), the security-vote lever, incumbent-blame sentiment, response levers, and simulator grounding (§5.4).

**Regional threat map (seed data — accurate as of mid-2026; treat as admin-tunable, see below).** `threat_type ∈ {banditry, insurgency, farmer_herder, separatist, militancy}`:
- **North-West** (Zamfara, Katsina, Kaduna, Sokoto, Niger): `banditry` — mass kidnap-for-ransom, village raids, a criminal economy (ransom, cattle-rustling, informal taxation, illegal mining). Highest share of national abductions; spreading south into the North-Central.
- **North-East** (Borno, Yobe, Adamawa — "BAY states"): `insurgency` — resurgent Boko Haram (JAS faction, targeting civilians) and ISWAP (targeting the military); ~3M displaced; near-zero trust in government.
- **North-Central / Middle Belt**: `farmer_herder` — organized, lethal intercommunal violence over land, with a religious overlay.
- **South-East**: `separatist` — IPOB agitation and "sit-at-home" enforcement that can shut down economic and electoral activity; threats/attacks on candidates and INEC facilities.
- **South-South (Niger Delta)**: `militancy` — oil-linked militant resurgence.
- Newer groups (Lakurawa in the NW, Mahmuda in the NC) and southward spread mean the map drifts — hence it lives as editable seed data, not constants.

**Mechanics (each deterministic given the run seed):**
- **R1 — Turnout suppression (P0-lite):** higher `insecurity_index` lowers `effective_turnout` (§5.2), shrinking the legitimate-vote pool in affected LGAs. This mirrors the documented reality that insecurity drives low turnout even when voting *interest* is high.
- **R2 — Campaign friction (P1):** per-LGA campaign-action cost scales with `insecurity_index`; above a threshold, `rally` is disabled and a seeded roll can fire a **disruption event** (`candidate_kidnap`, `sit_at_home`) that burns a turn / naira.
- **R3 — Rigging synergy (P1):** insecurity raises `low_observer_access` / `inec_could_not_deploy` in `context` (§5.3), lowering detection risk where the state is absent — the manipulator's advantage. Deliberately uncomfortable, and true to the source material.
- **R4 — Incumbent blame vs. instrumentalization (P1):** a security-incident event lowers incumbent approval in the affected region (and nationally if the player holds office). If the player is **opposition**, the same incident unlocks a campaign lever (run on insecurity). Fear can also be *weaponised* to depress a rival's turnout — a modelled, cynical option.
- **R5 — The security vote (P1, matters at governor tier):** an office-holder gets a discretionary `security_vote_budget` each period. **Fund security** → `insecurity_index` falls over N turns, approval rises slowly. **Divert it** → `naira` up, `efcc_risk` up, insecurity persists or worsens. The classic Nigerian governance temptation, as a slider.
- **R6 — Response levers (P1):** `militarized_operation`, `state_backed_militia`, or `state_of_emergency` (grounded in a Constitution s.305 rulebook provision) reduce insecurity but carry a seeded **civilian-harm** risk (e.g. an erroneous-airstrike event) → human-rights backlash → segment-specific approval hits in the simulator.
- **R7 — Simulator grounding (P1):** pass `insecurity_index` + `threat_type` into the §5.4 prompt/fallback so security-priority segments weight tangible local presence over announcements.

**Acceptance (Given/When/Then):**
- Given two LGAs identical but for `insecurity_index`, when votes resolve, then the higher-insecurity LGA yields lower `effective_turnout` and fewer `base_votes` (deterministic).
- Given high insecurity in a target LGA, when the player attempts result-manipulation there, then detection probability is measurably lower than the same action in a low-insecurity LGA.
- Given the player holds office and **diverts** the security vote, when turns advance, then `insecurity_index` does not fall and `efcc_risk` rises; given they **fund** security, then `insecurity_index` falls over N turns and approval rises.
- Given a `state_of_emergency` response with a triggered civilian-harm roll, when reactions resolve, then affected-region segments' approval drops and a rights-backlash event is recorded.

**Safety framing (extends §9):** insecurity is modelled at the level of **political consequence and governance choice** — turnout, approval, budget diversion, response trade-offs. The game does **not** let the player commission, plan, or graphically depict violence against civilians; attack/abduction events are **abstracted** (a number and a headline), never operational detail. The rigging-synergy is pointed satire of how state failure rewards manipulators, not a "combo" to celebrate.

### 5.11 Legacy scoring, clean alternatives & endings — P0 (the spine of the game)
This is what makes the game *about* good leadership rather than a corruption sandbox. It is **P0** — without it the game has no point of view. It has three parts: the score, the matched choices that feed it, and the endings that pay it off.

**A. The Legacy meters (tracked all run, shown to the player).** Four meters, deliberately separate from `naira`/power:
- **Nation Health (0–100)** — did life measurably improve under you: security (inverse of aggregate `insecurity_index`), power/jobs/schools proxies, service delivery. The headline "did you actually govern" number.
- **Public Trust (0–100)** — *genuine* approval, tracked **separately from bought or rigged support**. Rigged votes and bribed endorsements raise your vote total or short-term `popularity` but do **not** raise Public Trust — the engine keeps a `genuine` vs `manufactured` split on support so the player can feel the difference.
- **Integrity (0–100)** — starts high; clean choices hold/raise it, shortcuts erode it. Never directly visible to NPCs but weights endings and unlocks the "Statesman" arc.
- **International Standing (0–100)** — investment, diaspora confidence, recognition; raised by clean governance + delivery, lowered by detected rigging, atrocity-linked events (§5.10 R6), and prosecutions.

**B. Legacy Score (end of run).** A weighted blend, wealth barely counts:
`legacy = 0.35*NationHealth + 0.30*PublicTrust + 0.25*Integrity + 0.10*InternationalStanding` — with `naira` contributing **0**. (Weights live in the rulebook `params` so they're tunable without deploy.) This formula *is* the design thesis in one line: you can be broke and win, or rich and lose.

**C. Clean alternatives — every dirty option has a harder, legitimate twin.** The engine must present both; the clean one costs more `naira`/time/turns but builds `genuine` support, Integrity and Standing:
| Dirty option (fast, corrosive) | Clean twin (slow, legitimizing) |
|---|---|
| `godfather_deal` — fast funds, future demands, Integrity↓ | `grassroots_fund` / `diaspora_crowdfund` — slow, small, builds **genuine** Trust |
| Rig the vote (§5.3) — win now, institutions weaken, Integrity↓, tribunal risk | Run clean — you might **lose**, but a *noble loss* still scores Legacy (seeds a movement, boosts next cycle) |
| Divert security vote (§5.10 R5) — `naira`↑ | Fund security — costs you, Nation Health↑, Trust↑ |
| `intimidation` / weaponise fear (§5.10 R4) | `get_out_the_vote` — raise **genuine** turnout in your favour, legitimately |

**D. The "noble loss" rule.** Losing clean is **not** a game-over with nothing. If the player ran clean and lost, they still receive a Legacy result reflecting the movement they built, and a mechanical carry-over (a starting Trust/Standing bonus) to a next run. This is essential: it removes the incentive to rig "because losing means nothing," and makes principled defeat a *valid, scored* way to play.

**E. Endings (the payoff carries the message — no path is blocked).** Determined by the meters + whether the player held/kept power + EFCC status:
- **The Statesman** — high Nation Health + high Integrity + high Trust. Remembered for generations; institutions stronger for your having governed.
- **The Reformer Who Fell** — high Integrity, lost or was pushed out. A moral victory; the fire you lit outlasts you. (Reachable via the noble loss.)
- **The Big Man** — high `naira`/power, low Nation Health + low Trust, evaded prosecution. Rich, entrenched, untouchable — and reviled, the nation no better, your name a punchline. **Playable to completion; the epilogue is deliberately hollow.**
- **The Cautionary Tale** — corrupt *and* caught (`efcc_risk` triggered without immunity). Disgrace, asset seizure, prosecution.
- Citizen voices (reuse the §5.4 segment engine) narrate every epilogue in-character — the emotional core; the corrupt endings *feel* empty through the people's words, not a lecture from the game.

**Acceptance (Given/When/Then):**
- Given a player wins an election **by rigging**, when the run resolves, then their vote total reflects the rigged votes but **Public Trust does not rise** from them (genuine vs manufactured split holds).
- Given two runs with identical delivery but one clean and one corrupt, when scored, then the clean run's **Legacy score is higher** despite the corrupt run holding more `naira`.
- Given a player runs **clean and loses**, when the run ends, then they receive a non-zero Legacy result and a carry-over bonus (noble-loss rule), **not** a bare game-over.
- Given every mechanic offering a dirty option, when presented to the player, then a clean twin is also offered (or an explicit reason it's unavailable).
- Given a maxed-`naira`, low-Nation-Health, prosecution-evading run, when it ends, then the ending is **The Big Man** with a hollow epilogue — the run completes and is **not** blocked.

### 5.12 Time, turns & the result-lag rule — P0 (economy) / P1 (governing clock)
Time is modelled as **in-fiction turns**, not real-world clocks. It is a scarce resource in its own right, and the passage of time is itself part of the game's moral tension (see the result-lag rule below). All timing is integer-based and deterministic; the one optional real-world timer (§5.3) is cosmetic and excluded from tests.

**Turn granularity (decided):**
- **Campaign phase — 1 turn = 1 game-week.** The run-up to an election is a fixed budget of week-turns (default **6**).
- **Governing term — 1 turn = 1 game-month.** On winning office, `term_turns_remaining` is set from a rulebook `param` (e.g. a short **12-month** playable slice in v1; a full 48-month term later). Finer control during the campaign sprint, faster passage while governing.

**Action points (P0).** Each turn grants an **AP pool** (default 5, a rulebook `param`). Every action has an `ap_cost` (most = 1; heavy actions like a multi-LGA tour or a party-registration push = 2–3) charged **alongside** its naira cost. AP is the *time* budget; naira is the *money* budget; they are enforced independently, so a rich player can still run out of time. Turn advances when AP hits 0 (or on `rest`).

**Term clock (P1, governing).** While in office, each governing action spends AP within the current month-turn, and advancing burns `term_turns_remaining`. Tribunal appeals (§5.5) and some events also consume term-turns. When the clock hits 0 → term ends → re-election or the run resolves and Legacy is scored (§5.11).

**The result-lag rule (P1 — this is the thesis as a mechanic).** Effects are tagged **instant** or **lagged**:
- **Instant** (resolve the same turn): extractive/corrupt moves — bribe payoffs, diverting the security vote to naira (§5.10 R5), a successful rig. Corruption pays *now*.
- **Lagged** (enqueued to apply after **D** turns, default 2–4, a rulebook `param`): constructive delivery — funding security, building services, clean governance. These raise **Nation Health / Public Trust** only *later*.

So governance visibly pays slowly while corruption pays instantly — the honest path is also the *slower* path, and the clock is the reformer's enemy. Implemented as a deterministic **`pending_effects` queue** (`apply_on_turn`, `target_meter`, `delta`): on each turn advance, apply every effect whose `apply_on_turn == current_turn`.

**Config lives in the rulebook** (`params`, tunable with no deploy, per §5.7): AP pool, campaign length (weeks), term length (months), and lag **D**.

**Acceptance (Given/When/Then):**
- Given AP = 5 and an action with `ap_cost` = 2, when performed, then AP = 3 and the turn does **not** advance; when AP reaches 0, then the turn advances and AP resets.
- Given ample naira but AP = 0, when any AP-costing action is attempted, then it is rejected for **insufficient time** (time scarcity is independent of money).
- Given a **constructive** action with lag D performed on turn T, when resolved, then the target meter is unchanged on turn T and changes on turn **T+D** (from the queue, deterministic).
- Given a **corrupt** action performed on turn T, when resolved, then its naira/`efcc_risk` effect applies on **turn T** (instant).
- Given the optional election-day timer **disabled** (default / test mode), when election day runs, then outcomes are byte-identical to a run with no timer (determinism preserved).

---

## 6. The living rulebook: keeping the Constitution & policies current

This is the feature that keeps the game accurate as Nigerian law changes. Recommend **three ingestion paths at escalating effort**, shipping the simplest first.

### 6.1 Data model (versioned, effective-dated)
Two tables (DDL in §10):
- `rule_documents` — a source (e.g. *Electoral Act*, *1999 Constitution*), with a `version` string, `source_url`/`source_note`, `effective_from`, `effective_to` (nullable = current), and `status` (`draft`/`active`/`superseded`).
- `rule_provisions` — an individual, game-relevant chunk (e.g. "Section 84 — party primaries"), FK to a document version, with `title`, `body_text`, `tags` (JSON array, e.g. `["primaries","delegates"]`), an optional structured `params` JSON (e.g. `{"member_threshold": 5000, "spread_lgas": 12}`) that the engine reads, and `effective_from`/`effective_to`.

The **engine reads `params`** (typed numbers/gates); the **AI reads `body_text`** (natural-language grounding). Editing `params` changes game behaviour with no deploy (satisfies §5.7).

### 6.2 Path 1 — Manual entry (P0, ship first)
A protected admin form: create/edit a document version, add provisions with title/body/tags/params/effective dates, and mark old versions superseded. This is the **canonical, always-available** path and the fallback for the other two. It's enough to launch.

### 6.3 Path 2 — Document upload + assisted parse (P1)
Admin uploads an official PDF/text. A Worker extracts text and calls the AI provider to **propose** structured draft provisions (title, suggested tags, candidate `params`), which land in `status='draft'` for the admin to **review, correct, and approve**. Never auto-publish AI-parsed law. This is the sustainable middle path — far more robust than scraping and much faster than pure manual entry for long documents.

### 6.4 Path 3 — Assisted web fetch (P2, optional)
For a known official URL, a helper fetches the page and runs the same propose-draft-for-review flow as Path 2. **Explicitly not** an automated scraper: run on-demand, always human-reviewed, and expect it to break when sites change. Documented as best-effort convenience, not infrastructure.

### 6.5 Retrieval for the simulator
- **MVP (P0):** **tag-based** retrieval — the policy's `sector`/keywords map to provision `tags`; fetch matching current provisions and inject their `body_text` into the prompt. Simple, deterministic, free.
- **Later (P2):** embed provisions with **EmbeddingGemma** (`@cf/google/embeddinggemma-300m`) into **Vectorize** (free tier: 5M stored / 30M queried dimensions per month) for semantic retrieval when tags aren't enough.

**Recommendation:** ship **Path 1 + tag retrieval** for launch; add **Path 2** early because it removes the main pain (typing long statutes); treat **Path 3** and **Vectorize** as optional. This gives you accuracy-on-change without committing to fragile scraping.

---

## 7. Architecture & cost (edge, near-free)

```
Browser (SvelteKit UI)
        │
        ▼
SvelteKit @Cloudflare (Pages + Workers)   ← game logic, deterministic engine
   ├── D1  (SQLite at edge)   → all game state + rulebook rows
   ├── KV                     → cached rulebook bundle + cached AI responses
   ├── Workers AI (env.AI)    → policy simulator (default provider)
   └── [optional] Vectorize   → semantic provision retrieval (P2)
Secrets: ANTHROPIC_API_KEY (only if Anthropic provider is enabled)
```

**Free-tier envelope (verified July 2026 — confirm at deploy, these move):**
- **Workers:** ~100K requests/day, 10 ms CPU per invocation. Game queries fit; **AI inference runs on Cloudflare's GPUs on separate "neuron" billing, not against the 10 ms CPU**.
- **Workers AI:** ~**10,000 neurons/day** free (no card). A ~500-token Llama-3-class response ≈ 400–600 neurons ⇒ roughly **15–25 model calls/day**. **This is the binding constraint** → the §5.4 cache + fallback are mandatory to live inside it. Paid overflow is ~$0.011 / 1,000 neurons on the $5/mo Workers plan.
- **D1:** free ≈ **5 GB storage, 5M rows read/day, 100K rows written/day**. D1 **bills on rows *scanned*, not returned** → **index every filtered/joined column** and run `PRAGMA optimize`. Serve the rulebook from **KV**, not repeated D1 scans, since it's read-often/change-rarely.
- **KV:** free ≈ 1 GB, 100K reads/day, 1K writes/day — ideal for the rulebook bundle and AI-response cache (writes are rare).

**Cost rule of thumb for the implementer:** *reads should be point lookups on indexed keys; the rulebook and any repeated AI answer should come from KV; the model should only be hit on a genuine cache miss.* Follow that and a solo dev stays at **$0/month**.

### Alternative stack (documented fallback, not the build target)
**PocketBase on the existing Hetzner VPS** is viable and familiar (Emeka's default), and pairs naturally with the **Anthropic API** as the AI provider. Trade-off: it's a single region (not edge) and can't call Workers AI, so it loses goals #3 and part of #4. Choose it only if edge/latency and Workers-AI-for-free are deprioritised. The game logic and schema in this PRD port directly (SQLite ↔ PocketBase collections).

---

## 8. AI provider interface (swappable)

One function isolates the model so Workers AI and Anthropic are interchangeable (satisfies goal #4). Provider is chosen by an env var `AI_PROVIDER = "workers-ai" | "anthropic"`.

```ts
// contracts
interface PlayerContext {
  role: string; party: string; state: string;
  nationalPopularity: number; recentEvents: string[];
}
interface PolicyInput { title: string; sector: string; scope: "national"|"state"|"lga"; description: string; }

interface SegmentReaction {
  segmentId: string;
  reaction: "supportive"|"hostile"|"skeptical"|"indifferent";
  approvalDelta: number;         // -40..+40
  keyConcern: string;            // <= 20 words, Nigerian voice
  protestProbability: number;    // 0..100
  socialSentiment: "trending_positive"|"trending_negative"|"neutral"|"viral_backlash";
}
interface PolicySimResponse {
  segments: SegmentReaction[];
  summary: {
    netApprovalDelta: number;
    mostAffectedSegment: string;
    implementationViability: "high"|"medium"|"low";
    unintendedConsequences: string[];
    mediaNarrative: string;      // one fictional-outlet headline
    twitterTrend: string;        // one hashtag
  };
}

// single entry point — cache check happens BEFORE this is called
async function runPolicySim(input: PolicyInput, ctx: PlayerContext, provisions: string[], env): Promise<PolicySimResponse> {
  const prompt = buildPrompt(input, ctx, provisions);          // injects rulebook body_text
  const raw = env.AI_PROVIDER === "anthropic"
    ? await callAnthropic(prompt, env.ANTHROPIC_API_KEY)       // server-side fetch, key from Worker secret
    : await env.AI.run("@cf/meta/llama-3.1-8b-instruct",       // free-tier default; see model notes
        { messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }], max_tokens: 1024 });
  return validateOrFallback(raw, input, ctx);                  // strict JSON schema → else deterministic fallback
}
```

**Model notes (verified July 2026):**
- **Default (free):** `@cf/meta/llama-3.1-8b-instruct` — multilingual, runs on the free neuron tier, fine for MVP reactions.
- **Higher quality on Workers AI:** `@cf/zhipuai/glm-4.7-flash` (large context, strong multilingual, tool calling) or a Llama-3.3-70B / Llama-4-Scout class model (higher neuron cost / paid).
- **Anthropic provider (premium):** call `https://api.anthropic.com/v1/messages` from the Worker with the key as a **secret binding** (not the keyless in-artifact proxy). Use a current model from the Claude line (e.g. a Haiku-class model for cost, a Sonnet-class model for quality) — confirm the exact model id and pricing at `docs.anthropic.com` at build time rather than hardcoding from memory.
- **Safety classifier (optional):** `@cf/meta/llama-guard-3-8b` can screen user-authored party names / policy text before storage (see §9).
- Always request **strict JSON, no prose/markdown**, `max_tokens` set explicitly, and validate before use.

---

## 9. Safety requirements (non-negotiable, P0)

The theme is corruption *satire*; the implementation must not cross into real-world harm.

- **No real named living people.** Parties are fictional acronym labels; leaders are archetypes. Reject/҂ scrub any user-entered content naming real politicians in generated outputs.
- **Screen user-generated text** (custom party names, policy descriptions) before persistence — reject sexual content, content targeting real named individuals, slurs, or incitement. A classifier pass (`llama-guard-3-8b`) plus a denylist is sufficient for v1.
- **No sexual content and nothing involving minors, ever**, regardless of prompt.
- **Visible disclaimer**: the game is fiction/satire and its "rulebook" is a game abstraction, **not legal advice**.
- **Corruption mechanics are abstract game moves** (risk/reward tokens), never real-world how-to instructions. Prompts and outputs must not produce operational guidance for real electoral fraud.
- **Player data / registration (added post-v1, see §0A).** The sign-up gate collects only **name, email, and country**, behind an explicit consent checkbox, and stores them in the project's own D1 — never sold or sent to third parties. No phone number, no sensitive categories. This is the minimum for a launch mailing list; a visible privacy line and a delete-on-request path are required fast-follows. The admin write surface (`/admin`) must be gated by a server-side secret (`ADMIN_PASSWORD`), not a client check.

### 9A. Representation & national image (governs tone, not just safety)
The stated risk this addresses: a game where players "act as corrupt African politicians" could be read as **promoting corruption or trafficking the "corrupt Africa" stereotype**. The §1A reframe is the primary mitigation — the game is about *reforming* a broken system, not celebrating it — but the following are hard requirements, because mechanics alone don't control perception:

- **Point of view is the reformer and the citizens.** The framing voice throughout (UI copy, epilogues, tooltips) sides with ordinary Nigerians against the entrenched class. Corruption is depicted as **the obstacle**, and it is shown with its costs, never gleefully.
- **Punch up, never down.** Satirical targets are godfathers, riggers, and the political elite. Ordinary Nigerians, ethnic/religious groups, and "Nigeria" as an idea are **never** the butt of the joke. The §5.10 insecurity events are treated soberly (see §5.10 safety framing), never as spectacle.
- **The corrupt path must always read as the corrupt path** — via consequences and a hollow ending (§5.11), never as an aspirational or "cool" power fantasy. If a screenshot of the game travels, the design intent should still be legible from it.
- **Show the good.** The game must foreground competence, delivery, and genuine public trust as the winning, satisfying path (§5.11) — Nigeria as a place worth governing well, with citizens whose approval is worth earning.
- **Launch positioning is part of the product, not marketing's afterthought.** Store copy, trailers, and the tutorial must lead with the reformer-against-the-odds premise. **Avoid a "rig elections lol" hook** — the viral temptation of a Fantasy-Parliament-style launch — because the spicy screenshots are the ones that travel and would invert the message. This is a launch-gate checklist item, owned by §5.11's intent.
- **Author's standing is the honest defence:** a Nigerian-authored game dramatizing the real, lived frustration that the system is rigged against good people reads completely differently from an outsider's lazy trope — but only if the four points above hold in the shipped build.
- **Ethno-religious sentiment is modelled as *bloc politics*, never caricature (added post-v1, see §0A).** The religion / state-of-origin mechanic applies a modest home-state and co-religious support lean — a *lean, never a lock* — to dramatise how patronage and bloc voting actually function. It is a coarse, admin-tunable game abstraction: it never ranks, judges, or stereotypes any group, and the copy around it stays neutral. This punches at the *system* of ethno-religious patronage, in keeping with "punch up, never down."

---

## 10. Data model (D1 / SQLite — MVP subset)

Indexes shown are **required** (D1 rows-read billing). Full mechanics reuse the collection design from the prior concept; below is the launch subset.

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY, username TEXT, state TEXT, role TEXT,
  party_id TEXT, naira INTEGER, popularity INTEGER, national_popularity INTEGER,
  connections INTEGER, immunity INTEGER DEFAULT 0, efcc_risk INTEGER DEFAULT 0,
  security_vote_budget INTEGER DEFAULT 0,     -- office-holders only; fund-security vs divert lever (§5.10 R5)
  -- Legacy meters (§5.11) — the actual win condition; separate from naira/power
  nation_health INTEGER DEFAULT 50,
  public_trust INTEGER DEFAULT 50,            -- GENUINE trust only; rigged/bought support does NOT raise this
  integrity INTEGER DEFAULT 100,
  international_standing INTEGER DEFAULT 50,
  genuine_support INTEGER DEFAULT 0,          -- earned support
  manufactured_support INTEGER DEFAULT 0,     -- bought/rigged; inflates votes but not public_trust
  seed INTEGER NOT NULL,                      -- run seed → deterministic outcomes
  match_id TEXT,                              -- reserved for future multiplayer; NULL in v1
  created INTEGER, updated INTEGER
);
CREATE INDEX idx_players_match ON players(match_id);

CREATE TABLE parties (
  id TEXT PRIMARY KEY, name TEXT, acronym TEXT, is_registered INTEGER DEFAULT 0,
  member_count INTEGER, spread_json TEXT, war_chest INTEGER, is_fictional INTEGER DEFAULT 1
);

CREATE TABLE npcs (
  id TEXT PRIMARY KEY, name TEXT,
  type TEXT,                                  -- godfather|inec_official|judge|journalist|thug_leader
  state TEXT, bribability INTEGER, media_reach INTEGER,
  blackmail_risk INTEGER DEFAULT 0, employer_player_id TEXT
);

CREATE TABLE elections (
  id TEXT PRIMARY KEY, type TEXT, state TEXT, in_game_date TEXT,
  status TEXT, returning_officer_id TEXT, rigging_detected INTEGER DEFAULT 0, seed INTEGER
);
CREATE INDEX idx_elections_status ON elections(status);

CREATE TABLE candidacies (
  id TEXT PRIMARY KEY, player_id TEXT, election_id TEXT, position TEXT,
  state TEXT, lga TEXT, party_id TEXT,
  votes_legitimate INTEGER DEFAULT 0, votes_rigged INTEGER DEFAULT 0,
  total_declared INTEGER DEFAULT 0, result TEXT DEFAULT 'pending'
);
CREATE INDEX idx_cand_election ON candidacies(election_id);
CREATE INDEX idx_cand_player   ON candidacies(player_id);

CREATE TABLE lgas (                            -- per shipped state
  id TEXT PRIMARY KEY, state TEXT, name TEXT,
  registered_voters INTEGER, turnout REAL, loyalty_json TEXT,  -- turnout = BASE turnout; see effective_turnout in §5.2
  insecurity_index INTEGER DEFAULT 0,          -- 0..100, dynamic (§5.10); suppresses effective_turnout, lowers rigging detection
  threat_type TEXT                             -- banditry|insurgency|farmer_herder|separatist|militancy
);
CREATE INDEX idx_lgas_state ON lgas(state);
CREATE INDEX idx_lgas_threat ON lgas(threat_type);

CREATE TABLE campaign_actions (
  id TEXT PRIMARY KEY, player_id TEXT, election_id TEXT, turn INTEGER,
  action_type TEXT, lga TEXT, ap_cost INTEGER DEFAULT 1, naira_spent INTEGER,
  effect_json TEXT, created INTEGER
);
CREATE INDEX idx_campaign_player ON campaign_actions(player_id);

CREATE TABLE rigging_actions (
  id TEXT PRIMARY KEY, player_id TEXT, election_id TEXT, type TEXT, lga_target TEXT,
  amount_spent INTEGER, votes_gained INTEGER, detected INTEGER DEFAULT 0, detection_source TEXT
);
CREATE INDEX idx_rig_election ON rigging_actions(election_id);

CREATE TABLE policies (
  id TEXT PRIMARY KEY, player_id TEXT, title TEXT, description TEXT,
  sector TEXT, scope TEXT, status TEXT DEFAULT 'proposed', sim_cache_key TEXT, created INTEGER
);
CREATE INDEX idx_policies_cachekey ON policies(sim_cache_key);

CREATE TABLE policy_simulations (             -- durable copy of AI/fallback result
  id TEXT PRIMARY KEY, policy_id TEXT, cache_key TEXT UNIQUE,
  segments_json TEXT, summary_json TEXT, net_approval_delta INTEGER,
  produced_by TEXT,                           -- workers-ai|anthropic|fallback
  created INTEGER
);
CREATE INDEX idx_sims_cachekey ON policy_simulations(cache_key);

CREATE TABLE tribunal_cases (
  id TEXT PRIMARY KEY, election_id TEXT, petitioner_id TEXT, respondent_id TEXT,
  judge_id TEXT, evidence_score INTEGER, bribe_paid INTEGER DEFAULT 0,
  status TEXT DEFAULT 'filed', ruling TEXT DEFAULT 'pending'
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT,                                   -- scandal|protest|efcc_watch|efcc_prosecution
                                               --  | mass_abduction|village_raid|candidate_kidnap|sit_at_home
                                               --  | erroneous_airstrike|market_disruption   (insecurity events, §5.10)
  player_id TEXT, state TEXT, lga TEXT,
  popularity_impact INTEGER, naira_impact INTEGER, efcc_risk_impact INTEGER,
  insecurity_impact INTEGER DEFAULT 0,         -- delta applied to target LGA insecurity_index
  expires_at INTEGER, created INTEGER
);
CREATE INDEX idx_events_player ON events(player_id);

CREATE TABLE game_state (                      -- single-player save pointer
  id TEXT PRIMARY KEY, player_id TEXT, phase TEXT, current_election_id TEXT,
  in_game_date TEXT,
  turn INTEGER DEFAULT 0,                       -- current turn index (§5.12)
  action_points_remaining INTEGER,             -- resets to the per-turn AP pool each turn
  term_turns_remaining INTEGER,                -- governing clock; NULL when not in office
  updated INTEGER
);

CREATE TABLE pending_effects (                 -- result-lag queue (§5.12); constructive effects apply later
  id TEXT PRIMARY KEY, player_id TEXT,
  apply_on_turn INTEGER,                        -- effect fires when game_state.turn == this
  target_meter TEXT,                            -- nation_health|public_trust|integrity|international_standing|insecurity
  delta INTEGER, source TEXT, created INTEGER
);
CREATE INDEX idx_pending_turn ON pending_effects(player_id, apply_on_turn);

CREATE TABLE legacy_results (                  -- §5.11 end-of-run outcome
  id TEXT PRIMARY KEY, player_id TEXT,
  legacy_score INTEGER,
  ending TEXT,                                 -- statesman|reformer_who_fell|big_man|cautionary_tale
  nation_health INTEGER, public_trust INTEGER, integrity INTEGER, international_standing INTEGER,
  was_noble_loss INTEGER DEFAULT 0,            -- clean-and-lost → carry-over bonus to next run
  epilogue_json TEXT,                          -- citizen-voice lines from the §5.4 segment engine
  created INTEGER
);
CREATE INDEX idx_legacy_player ON legacy_results(player_id);

-- ---------- Living rulebook ----------
CREATE TABLE rule_documents (
  id TEXT PRIMARY KEY, title TEXT, version TEXT, source_note TEXT, source_url TEXT,
  status TEXT,                                 -- draft|active|superseded
  effective_from TEXT, effective_to TEXT, created INTEGER
);
CREATE INDEX idx_ruledocs_status ON rule_documents(status);

CREATE TABLE rule_provisions (
  id TEXT PRIMARY KEY, document_id TEXT, title TEXT, body_text TEXT,
  tags_json TEXT,                              -- ["primaries","tribunal",...]
  params_json TEXT,                            -- {"member_threshold":5000,...} engine reads this
  status TEXT, effective_from TEXT, effective_to TEXT, created INTEGER
);
CREATE INDEX idx_prov_doc  ON rule_provisions(document_id);
CREATE INDEX idx_prov_stat ON rule_provisions(status);
-- tag filtering in v1 is done in-Worker over current provisions (small table) or via a tags lookup table if it grows.
```

---

## 11. Success metrics

**Leading (days–weeks)**
- **Loop completion rate** ≥ **60%** of players who start a run reach an outcome screen. *(Measure: outcome events ÷ run-start events.)*
- **Median time-to-complete** a run **< 20 min**.
- **AI cache-hit rate** ≥ **70%** on the policy step in normal play *(keeps neuron usage inside free tier)*.
- **Fallback invocation rate** < **10%** *(if higher, the provider/JSON validation needs work)*.
- **"Good-leadership read"** — in playtests, ≥ **70%** of players correctly identify that clean play is the high-score path (post-run survey), confirming §1A/§5.11 land. If lower, the scoring/endings aren't communicating the premise.
- **Cost:** **$0** Cloudflare spend through beta.

**Lagging (weeks–months)**
- **Return rate:** ≥ 25% of players start a second run within 7 days.
- **Rulebook freshness:** time from a real legal change to it being reflected in-game **< 1 day** (proves the no-deploy update path works).
- **Zero** safety incidents (no generated content violating §9).

---

## 12. Test plan (assertion-based, deterministic)

The engine is testable because everything but the LLM is seeded and pure.

1. **Vote maths (unit):** fixed seed + fixed actions → assert exact final `support_index` and `votes_legitimate`.
2. **Currency guards (unit):** attempt an action without enough naira → assert rejection + unchanged state.
3. **Rigging detection (unit):** feed contexts with/without observers → assert probability ordering; fixed seed → assert deterministic detected/undetected.
4. **Fallback (unit):** stub the provider to return malformed JSON and to throw → assert a valid `PolicySimResponse` from the fallback both times.
5. **Cache (integration):** run the same policy twice with a call-counter on the provider → assert **0** model calls on the second run.
6. **Rulebook no-deploy (integration):** change a provision's `params` value, start a new run → assert the game uses the new value.
7. **Provision versioning (unit):** two versions with different effective dates → assert the engine selects the one effective on the in-game date.
8. **Safety (unit):** feed banned inputs (real-name, sexual, slur) to the screening step → assert rejection.
9. **Tribunal (unit):** detected-rigging run vs clean run → assert petitioner `evidence_score` is higher in the former; fixed seed → deterministic ruling.
10. **Insecurity turnout (unit):** two LGAs identical but for `insecurity_index` → assert higher insecurity yields lower `effective_turnout` and fewer `base_votes` (deterministic).
11. **Insecurity + rigging (unit):** same rigging action in a high- vs low-`insecurity_index` LGA → assert lower detection probability in the high-insecurity case.
12. **Security vote (integration):** fund-security path lowers `insecurity_index` over N turns and raises approval; divert path holds insecurity and raises `efcc_risk`. *(P1 — runs from Milestone C/D.)*
13. **Genuine vs manufactured (unit):** win by rigging → vote total reflects rigged votes but `public_trust` does not rise from them.
14. **Legacy weighting (unit):** two runs, identical delivery, one clean + one corrupt → assert the clean run's `legacy_score` is higher despite the corrupt run holding more `naira`.
15. **Noble loss (integration):** clean run that loses the election → assert a non-zero `legacy_result` with `was_noble_loss=1` and a carry-over bonus, not a bare game-over.
16. **Clean-twin presence (unit):** for each dirty option, assert a clean alternative is offered (or an explicit unavailable-reason is returned).
17. **Endings (unit):** meter fixtures for each ending → assert correct `ending` selected; the Big Man fixture completes to a hollow epilogue and is not blocked.
18. **AP economy (unit):** AP=5, action `ap_cost`=2 → AP=3, turn holds; AP→0 → turn advances and AP resets (deterministic).
19. **Time ≠ money (unit):** ample naira, AP=0 → any AP-costing action rejected for insufficient time.
20. **Result-lag (unit):** constructive action with lag D on turn T → target meter unchanged at T, changed at T+D (from `pending_effects`); a corrupt action's effect applies at T.
21. **Timer determinism (unit):** run election day with the optional timer disabled vs a no-timer run → assert identical outcomes.

**Definition of done per milestone = its listed tests pass green.**

---

## 13. Milestones (suggested phasing)

> **Current status:** A ✅ · B ⛔ · C 🟡 (rulebook admin done) · D 🟡 (tribunal + endings done). Details in §0A.

- **Milestone A — Deterministic core (no AI):** schema + seed system + setup + campaign loop + **AP/turn time economy (§5.12 P0)** + election + rigging detection + save/load + **insecurity P0-lite** + **Legacy meters & genuine/manufactured split (§5.11 A–C)** wired into the loop + clean-twin choices. *Tests 1–3, 6, 7, 10, 11, 13, 14, 16, 18, 19 pass.* Fully playable minus policy/tribunal.
- **Milestone B — AI policy simulator:** provider interface + prompt grounding (incl. insecurity context) + JSON validation + **cache** + **fallback**. *Tests 4, 5, 8 pass.*
- **Milestone C — Living rulebook:** admin CRUD (Path 1) + tag retrieval wired into B; then Path 2 upload-assist. *Tests 6, 7 re-verified end-to-end.*
- **Milestone D — Governing clock, tribunal, events, endings + polish:** **term clock + result-lag queue (§5.12 P1)**, tribunal exchange, event engine (incl. insecurity events + security-vote lever + response levers), EFCC/immunity + defection mechanic, **§5.11 endings + noble-loss + citizen-voice epilogues**, optional election-day timer, §9A tone pass, disclaimer, UI pass. *Tests 9, 12, 15, 17, 20, 21 pass.*

---

## 14. Open questions

- **[Product — RESOLVED, see §0A]** ~~Which single state ships first?~~ v1 ships **all 36 states + FCT** (national presidential race) at state granularity; each state carries its own `threat_type` from the §5.10 regional map, so insecurity is felt nationwide rather than fixed by one state choice.
- **[Product — RESOLVED, see §0A]** ~~Starting tier: `lga_chair` vs governorship?~~ v1 runs a national **presidential** race. (The §5.10 R5 security-vote lever, which bites at governor tier, remains unbuilt — Milestone D.)
- **[Eng]** For provision retrieval at launch, is **tag-matching** sufficient, or does the first policy set already need Vectorize? *Assumption: tags suffice for v1.*
- **[Eng/Legal-ish]** Exact source texts to seed the rulebook (which sections of the Constitution / Electoral Act 2022 to encode first) — start with: party registration, primaries (s.84), post-election petition window, immunity clause, **and state-of-emergency powers (Constitution s.305) for the §5.10 response lever**. Confirm the specific provisions to encode.
- **[Product/Eng]** Insecurity depth for v1: confirm shipping only **P0-lite** (turnout suppression + data model) in Milestone A and deferring the security-vote/response levers to P1, vs pulling more forward. *Assumption: P0-lite in A, rest in C/D.*
- **[Design — DECIDED]** Difficulty stance is the **honest middle** (§1A): clean victory is possible but hard; virtue isn't free; corruption isn't mandatory. Open sub-question: exact tuning of *how* hard clean play is — needs playtest calibration, not a spec decision.
- **[Design]** Legacy weight tuning (§5.11 B) and the noble-loss carry-over size — start from the given formula, tune in playtest; weights live in rulebook `params`.
- **[Design — DECIDED]** Time model (§5.12): in-fiction **turns**, not real-world clocks; **campaign turn = 1 game-week (6-week default)**, **governing turn = 1 game-month**; AP pool default 5; result-lag D = 2–4. No countdown timers in the core loop; the only real-world timer is the optional, off-by-default election-day one. Open sub-question: exact AP costs per action and term length for v1 — tune in playtest (all live in rulebook `params`).
- **[Eng]** Anthropic model id + budget **if** the premium provider is enabled — confirm from current docs at build time.
- **[Design]** Fallback scorer weights per segment — needs a first pass of segment attributes to tune plausibility.

---

## 15. Appendix — demographic segment seed (for §5.4 fallback + prompt)

Ship ~6–8 fictionalised segments with attributes the fallback scorer can weight (e.g. `price_sensitivity`, `trust_in_govt`, `social_media_reach`, `security_priority`, `region`, `local_presence_bias`). The last two matter for §5.10: high-`security_priority` segments in insecurity-hit regions weight **tangible local security** (`implementation_viability`) over announcements, and carry a **low `trust_in_govt`** baseline (near-zero for NE/NW communities), so rhetoric alone barely moves them. Suggested starting set, tagged by dominant threat where relevant: Urban middle class (low insecurity) · Market traders (informal sector; hit by `market_disruption` → food prices) · Oil-region youth (`militancy`) · Northern farming communities (`banditry`/`farmer_herder`, high security_priority, low trust) · North-East displaced/returnee communities (`insurgency`, lowest trust) · Federal civil servants · Youth/social-media class (amplify security failures) · Traditional & religious leaders (bloc influence) · Diaspora-dependent households. Each stores a short description string (for the prompt) and a numeric attribute vector (for the deterministic fallback).
