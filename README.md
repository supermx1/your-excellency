# 🇳🇬 Your Excellency — Fantasy Naija

A turn-based, single-player political simulation game set in Nigeria. Run for president, campaign across all 36 states and the FCT, navigate godfatherism and corruption, win (or lose) an election, propose policy, survive a tribunal — and try to leave a legacy worth celebrating.

**The premise:** try to be a good leader when the entire system — godfathers, riggers, insecurity, the bribe economy — is engineered to stop you.

## How the game works

You play through five phases in a single run (under 20 minutes):

1. **Setup** — Pick your party, career background, wealth level, religion, home state, and scandal history. Each choice shapes your starting stats (war chest, popularity, connections, integrity, EFCC risk) via a live preview.
2. **Campaign** — Spend 6 weeks of action points on rallies, media blitzes, grassroots outreach, and more across a real SVG map of Nigeria. Choose between clean campaigning and corrupt shortcuts — bribery and rigging are available, but they carry detection risk.
3. **Election** — Votes are calculated state-by-state using turnout, insecurity suppression, religious/regional leans, rigging, and your campaign performance. Win the national count or face defeat.
4. **Policy** — If elected, propose one policy and watch how demographic groups react (deterministic fallback; AI-powered reactions are a planned feature).
5. **Tribunal** — Your opponent (or you, if you lost) can challenge the result. Defend or attack with legal spend, evidence, or public pressure.

Your **Legacy Score** rewards nation health, public trust, integrity, and international standing — *not* wealth. The corrupt route is fully playable, but leads to hollow endings. Every dirty option has a clean, harder twin.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [SvelteKit](https://svelte.dev) (Svelte 5) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 (neobrutalist design system) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) |
| Cache | [Cloudflare KV](https://developers.cloudflare.com/kv/) (rulebook + AI response cache) |
| AI (planned) | Cloudflare Workers AI / Anthropic API (provider interface, not yet wired) |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) + Workers |
| Map | [@svg-maps/nigeria](https://www.npmjs.com/package/@svg-maps/nigeria) |
| Package manager | pnpm |

## Prerequisites

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io) v9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency)

## Getting started

### 1. Install dependencies

```sh
pnpm install
```

### 2. Set up the local database

Create the local D1 database and run migrations:

```sh
pnpm wrangler d1 execute fantasy-naija --local --file=migrations/0001_fantasy_naija.sql
pnpm wrangler d1 execute fantasy-naija --local --file=migrations/0002_leads.sql
```

### 3. Configure local environment

Create a `.dev.vars` file in the project root (this is gitignored):

```env
ADMIN_PASSWORD=your-local-admin-password
```

This password is used to authenticate on the `/admin` page. If omitted, it defaults to `emeka-local-admin` during local development.

### 4. Run the dev server

```sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to play the game.

## Playing the game

1. **Visit the home page** — you'll land on the character builder.
2. **Build your candidate** — choose career, wealth, scandal history, religion, and home state. The stat preview updates live.
3. **Pick a party** — join an existing party or found your own (requires meeting the membership threshold set in the rulebook).
4. **Register** — a one-time gate collects your name, email, and country before starting the run.
5. **Campaign** — each turn gives you action points to spend. Pick actions, set a spend level (small / medium / large), and target states on the map.
6. **Face election day** — watch the results roll in state by state.
7. **Govern or concede** — propose policy if you won, challenge at tribunal if you lost.
8. **See your Legacy** — your final score reflects how you led, not how much you stole.

## Admin panel — the living rulebook

The game's rules are grounded in a versioned, editable rulebook derived from the Nigerian Constitution and Electoral Act 2022. The admin panel at `/admin` lets you edit these rules **without redeploying** — changes take effect for new game runs immediately.

### What the admin controls

The rulebook is a JSON array of **provisions**, each with:

| Field | Description |
|-------|-----------|
| `id` | Unique provision identifier (e.g. `EA-REG-001`) |
| `document` | Source document name |
| `title` | Human-readable title |
| `body` | Plain-English description of the rule |
| `tags` | Array of tags for the game engine to look up (e.g. `["party_registration"]`) |
| `params` | Key-value parameters the engine reads (e.g. `{ "member_threshold": 5000 }`) |
| `effective_from` | Date the provision takes effect |

**Default provisions shipped with the game:**

- **`EA-REG-001`** — Party registration threshold (membership count + LGA spread required to found a party)
- **`EA-TRIB-001`** — Post-election petition window (days allowed to file a tribunal challenge)
- **`LEGACY-001`** — Legacy score weights (how much each dimension contributes to the final score)

### How to use the admin panel

1. Navigate to `/admin` in your browser.
2. Edit the provisions JSON in the text area.
3. Enter the admin password.
4. Click **Save rulebook**.

The provisions are persisted to D1 and cached in KV. New runs pick up the updated rules; in-progress runs are not affected.

### Setting the admin password

**Local development:** Set `ADMIN_PASSWORD` in your `.dev.vars` file:

```env
ADMIN_PASSWORD=your-secret-password
```

**Production (Cloudflare):** Set it as a Wrangler secret so it's encrypted and never visible in your config:

```sh
pnpm wrangler secret put ADMIN_PASSWORD
```

You'll be prompted to enter the password value. If no secret is set, the admin page shows a warning banner and accepts the default dev password — **do not leave this unset in production**.

## Deployment

Build and deploy to Cloudflare Pages:

```sh
pnpm deploy
```

This runs `vite build && wrangler deploy`. Make sure you've:

1. Created the D1 database: `pnpm wrangler d1 create fantasy-naija`
2. Applied migrations: `pnpm wrangler d1 execute fantasy-naija --file=migrations/0001_fantasy_naija.sql` (repeat for each migration)
3. Set the admin secret: `pnpm wrangler secret put ADMIN_PASSWORD`
4. Updated `wrangler.jsonc` with your database ID if it differs

## Scripts

| Command | Description |
|---------|-----------|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm check` | Type-check with svelte-check |
| `pnpm lint` | Check formatting (Prettier) |
| `pnpm format` | Auto-format all files |

## Project structure

```
src/
├── lib/
│   ├── game/
│   │   ├── engine.js       # Core game engine — turns, votes, rigging, tribunal
│   │   ├── engine.test.js   # Unit tests for the engine
│   │   └── rulebook.js      # Default rulebook + 37 state definitions
│   ├── server/
│   │   └── rulebook.js      # D1/KV read/write for rulebook persistence
│   └── assets/              # Static assets (favicon, etc.)
├── routes/
│   ├── +page.svelte         # Main game UI (all phases)
│   ├── admin/               # Rulebook admin panel
│   ├── api/                 # API endpoints
│   └── demo/                # Demo routes
migrations/                  # D1 SQL migrations
wrangler.jsonc               # Cloudflare Workers/D1/KV bindings
```

## License

Private — not open source.
