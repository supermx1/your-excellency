# Hyperframes Composition Brief: Fantasy Naija

## Objective
Create a short launch-style brag video for Fantasy Naija — a neobrutalist Nigerian political simulator.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/Users/supermx/Projects/fantasy-naija`
- Primary files read: `src/routes/+page.svelte`, `src/lib/game/engine.js`, `src/lib/game/rulebook.js`, `src/routes/layout.css`
- Product name: Fantasy Naija
- Live URL: fantasy-naija.techgfx.workers.dev
- Tagline / strongest claim: "Win Aso Rock without losing the country." / "Money counts for nothing — Legacy is the only real score."
- Key UI or visual moment to recreate: the clickable SVG map of Nigeria (37 states colored lime=winning / rose=losing); the character-builder live stat card; the green (clean) vs red (dirty) action cards.
- Copy that must appear verbatim:
  - "EVERYBODY SAYS THEY'D FIX NIGERIA."
  - "So we built the game where you actually try."
  - "Run for President. All 36 states + FCT."
  - "War chest ₦8.0bn" · "Integrity 70" · "EFCC risk 20"
  - "Ward-by-ward ground game — builds real support"
  - "Godfather deal — fast money, no receipts. EFCC go dey watch you."
  - "Every shortcut has a price."
  - "GET RICH. OR GET REMEMBERED. YOU CAN'T DO BOTH."
  - "fantasy-naija.techgfx.workers.dev"

## Creative Direction
- Tone preset: app-store
- Creative direction: bold Nigerian neobrutalist campaign ad — thick black borders, hard offset shadows, political-poster confidence, satirical bite.
- Interpretation: clean feature-card reveals with readable holds (app-store structure), delivered with neobrutalist punch — every card is a `4px` black-bordered block with a hard `6px 6px 0 #000` drop shadow. Two hard SLAM lines (the opening hook, the closing hook) hit like campaign slogans. Confident and punchy, never chaotic.
- Angle: Everyone has an opinion on how to fix Nigeria — this is the game that calls the bluff. A real, playable satire (clickable Nigeria map, a character builder that hands you a corrupt-rich or clean-broke starting hand, a score where wealth is worth zero) that drives at one quotable thesis: you can get rich, or get remembered — not both.
- Hook: "EVERYBODY SAYS THEY'D FIX NIGERIA." slams onto an amber card; then "So we built the game where you actually try."
- Outro / punchline: "Money counts for nothing." → the SLAM: "GET RICH. OR GET REMEMBERED. YOU CAN'T DO BOTH." → wordmark + URL.
- Avoid:
  - Generic SaaS language ("streamline", "workflow")
  - Abstract filler visuals / particle fields / color washes
  - Any redesign that abandons the neobrutalist black-border identity

## Visual Identity
- Background: amber-100 `#fef3c7`
- Text / borders: black `#000` (4px borders; hard `6px 6px 0 #000` offset shadows; no soft blur)
- Accent (hero / clean): emerald-400 `#34d399`, lime-300 `#bef264`
- Danger (dirty / loss): rose-400 `#fb7185`, rose-300 `#fda4af`
- Highlight chip: yellow-300 `#fde047`
- Display font: Inter (weight 900 / `font-black`), UPPERCASE for headings; system-ui fallback
- Body font: Inter (500–700)
- Visual references from the project: the emerald hero band with a rotated yellow "Fantasy Naija" chip; thick-bordered action cards (lime for clean, rose for dirty); the Nigeria SVG map; the "You'll start with" stat block.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.5s — "EVERYBODY SAYS THEY'D FIX NIGERIA." slams; yellow chip "So we built the game where you actually try."
2. The map — 4s — Fantasy Naija wordmark + Nigeria SVG map fills state-by-state (lime/rose); "Run for President. All 36 states + FCT."
3. Build your candidate — 4s — select flips "Broke reformer" → "Billionaire outsider"; stat rows tick in (War chest ₦8.0bn · Popularity 36 · Connections 30 · Integrity 70 · EFCC risk 20); "Pick your background. Then live with it."
4. Clean vs dirty — 4.5s — green card slides in, red "Godfather deal" card SLAMS in; "Every shortcut has a price."
5. Outro / hook — 4s — "Money counts for nothing." then the SLAM "GET RICH. OR GET REMEMBERED. YOU CAN'T DO BOTH." then wordmark + URL.

The real Nigeria map path data can be taken from the `@svg-maps/nigeria` package (in `node_modules/@svg-maps/nigeria/`, viewBox `0 0 744 600`) — use it to recreate the map authentically.

## Audio
- Audio role: confident rhythmic bed with campaign-ad punch.
- Audio arc: enters on the opening slam over the track's intro; the beat kicks in as the map fills; steady groove through the stat and action-card reveals; hard impact on the closing hook; clean tail under the URL.
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM, confident business bed).
- Music treatment: start at 0, steady mid-volume presence (~0.5–0.6), no fade-in; let it carry the whole 20s and end cleanly under the wordmark.
- Music cue guidance: cue JSON at `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`. Strong cue at **17.02s** → lock the closing hook slam (scene 5, ~16.5–17s). Beat grid (0.5s spacing from 3.02s): map fill near **3.52s**; stat rows on the grid ~7–9s (snap to every other beat so text stays readable); action cards ~12–14s.
- Audio-reactive treatment: subtle — let the map's fill and the hero cards' presence breathe slightly with music RMS; no waveform bars, no equalizers.
- Audio-coupled moments:
  - Scene 1 — impact hit on the headline slam.
  - Scene 3 — soft counter tick per stat row (fire with each row).
  - Scene 4 — light chime on the green card, low thud on the red card SLAM.
  - Scene 5 — hard impact hit on the closing hook slam (may ring over the music tail).
- SFX selection guidance: use `impact/` for the two SLAM lines, `ui/` or `interface/` for stat ticks and the green card, a heavier `impact/` for the red card. Match sound to motion; keep it restrained — the two SLAM hits must stay clean.
- SFX analysis guidance: `/Users/supermx/.claude/plugins/cache/brag/brag/0.1.0/skills/brag/assets/sfx/sfx-analysis.md` — prefer low high-frequency-risk files for the repeated stat ticks.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: music is copied into `brag-output/composition/assets/music/`; copy any selected SFX into `brag-output/composition/assets/`.

## Hyperframes Instructions
Use the current `hyperframes` skill and CLI workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI/visual from the project (the Nigeria map and the neobrutalist cards are the anchors).
- Keep all text readable — the two hook lines get the longest holds (~1.8s and ~2.2s).
- Keep the video within 15–25 seconds (target 20s).
- Include the music + SFX layer.
- Lock the closing hook slam to the 17.02s strong cue (±0.15s), mark `// beat-locked`.
- Snap stat rows and action cards to the beat grid (±0.10s), mark `// beat-grid`; hold readable text to the reading floor (snap to every other beat).
- Wire at least one visual element to audio-reactive data (map fill or card presence); if extraction is unavailable, document and skip.
- Run Hyperframes lint and validate before render.
