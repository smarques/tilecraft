# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start local dev server (wrangler pages dev — required for /api/* routes)
npm test             # run tests (Vitest)
npm run test:watch   # watch mode
```

Run a single test file:
```bash
npx vitest run functions/api/save-game.test.js
```

Apply schema to local D1:
```bash
npx wrangler d1 execute tilecraft-db --local --file=functions/schema.sql
```

Apply schema to production D1:
```bash
npx wrangler d1 execute tilecraft-db --file=functions/schema.sql
```

**Never use a plain HTTP server** (`live-server`, `serve`, etc.) — `/api/*` routes only work under `wrangler pages dev`.

## Architecture

Vanilla JS static site on Cloudflare Pages with no bundler or framework. Three runtime layers:

1. **`i18n.js`** — fetches `locales/en.json`, `data/words.json`, and `data/categories.json` in parallel, exposes `window.t`, `window.gameWords`, `window.categories`, and fires `document:i18n:ready` when done. `script.js` waits on this event before calling `initGame()`.

2. **`script.js`** — all game logic and UI. Tile state is an array of `{id, element, index}` objects where `id` is the tile's solved-position identity and `index` is its current grid position. A tile is solved when `id === index`. The empty tile always has `id === TOTAL_TILES - 1`. Score = `moves + (selectedTiles × 50)`.

3. **`functions/api/`** — Cloudflare Pages Functions (serverless):
   - `GET /api/scores` — returns top 100 rows from D1 ordered by score DESC
   - `POST /api/save-game` — validates and inserts a game session; `boardState` must be exactly 36 elements

Both functions check `env.ALLOWED_ORIGIN` and return 403 if the request origin doesn't match. In local dev the variable is unset so all origins pass.

## Key behaviours

- **Selection contiguity** — `enforceSelectionRules()` repeatedly deselects tiles with no adjacent selected neighbour until stable. Runs after every click, drag, and tile slide.
- **Shuffle** — 300 simulated valid moves (never reversing the last move) so the board is always solvable.
- **Save flow** — fires DB write in the background (non-blocking), then captures a screenshot with `html2canvas` and downloads it as PNG.
- **Audio** — synthesised via Web Audio API; `AudioContext` is created at module load and resumed on first user gesture.
