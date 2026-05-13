# Tilecraft

A sliding tile puzzle game where you arrange word tiles on a 6×6 grid. Built as a static site deployed on Cloudflare Pages, with session data persisted to Cloudflare D1.

---

## How to play

1. Enter your name to start.
2. **Move mode** — click any tile adjacent to the empty space to slide it.
3. **Highlight mode** — click or drag to select a contiguous group of tiles.
4. When you have a group highlighted that you want to keep, click **Save** and write a statement (minimum 30 words). The game captures a screenshot of your board and comment, downloads it as a PNG, and records the session to the database.
5. The puzzle is solved when all tiles are in their original order.

**Score** = moves + (highlighted tiles × 50)

---

## Project structure

```
tilecraft/
├── index.html               # Game shell and modals
├── script.js                # Game logic, UI, save flow
├── style.css                # Styles
├── i18n.js                  # Loads translations and word/category data
├── admin/
│   └── index.html           # Admin panel SPA
├── data/
│   ├── words.json           # Default word list (fallback if D1 not set)
│   └── categories.json      # Default category definitions (fallback if D1 not set)
├── locales/
│   └── en.json              # English UI strings
├── functions/
│   ├── schema.sql           # D1 table definitions
│   └── api/
│       ├── save-game.js     # POST /api/save-game
│       ├── scores.js        # GET /api/scores (public leaderboard)
│       ├── words.js         # GET /api/words (public, D1 with static fallback)
│       ├── categories.js    # GET /api/categories (public, D1 with static fallback)
│       ├── settings.js      # GET /api/settings (public tagline + about)
│       └── admin/
│           ├── _auth.js     # Shared auth utilities (PBKDF2, sessions)
│           ├── setup.js     # POST /api/admin/setup (first-run only)
│           ├── login.js     # POST /api/admin/login
│           ├── logout.js    # POST /api/admin/logout
│           ├── me.js        # GET /api/admin/me
│           ├── scores.js    # GET /api/admin/scores
│           ├── words.js     # GET/PUT /api/admin/words
│           ├── categories.js# GET/PUT /api/admin/categories
│           ├── settings.js  # GET/PUT /api/admin/settings
│           └── scores/
│               └── [id].js  # DELETE /api/admin/scores/:id
└── wrangler.toml            # Cloudflare Pages + D1 binding config
```

---

## Local development

```bash
npm install          # install test dependencies
npm run dev          # start local dev server (wrangler pages dev — required for /api/* routes)
npm test             # run the test suite (Vitest)
npm run test:watch   # watch mode
```

**Never use a plain HTTP server** (`live-server`, `serve`, etc.) — `/api/*` routes only work under `wrangler pages dev`.

---

## Cloudflare setup (first time)

**1. Create the D1 database**

```bash
npx wrangler d1 create tilecraft-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "tilecraft-db"
database_id = "<your-database-id>"
```

**2. Apply the schema**

Local:
```bash
npx wrangler d1 execute tilecraft-db --local --file=functions/schema.sql
```

Production:
```bash
npx wrangler d1 execute tilecraft-db --file=functions/schema.sql
```

**3. Deploy**

```bash
npx wrangler pages deploy .
```

---

## Admin panel

The admin panel lives at `/admin/` and lets you manage the word list, browse and delete high scores, and edit the header tagline and about page.

### First-time setup

After deploying (or running `npm run dev` locally), create the admin account by calling the setup endpoint once. It returns 404 on any subsequent call, so it can only be used when no admin exists yet.

```bash
curl -X POST https://your-site.pages.dev/api/admin/setup \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"yourpassword123"}'
```

For local dev:
```bash
curl -X POST http://localhost:8788/api/admin/setup \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"yourpassword123"}'
```


### Logging in

Open `/admin/` in your browser and sign in with the credentials you set above.

### What the admin can do

| Tab | Actions |
|-----|---------|
| **Scores** | Browse all saved game sessions; delete individual entries (with confirmation) |
| **Words** | Add or remove words, set their category, load the bundled defaults, save to D1. Also manage categories: edit label and colour, add new categories, delete unused ones |
| **Settings** | Edit the header tagline; write an About page in Markdown |

Changes to words and settings take effect immediately for all visitors — no redeployment needed.

### Authentication details

- Passwords are hashed with **PBKDF2-SHA256** (100 000 iterations, random per-user salt) via the Web Crypto API.
- Sessions are stored in D1 and expire after **7 days**. The session token is sent as an **HttpOnly, SameSite=Strict** cookie.

---

## Database

### `game_sessions`

Saved whenever a player confirms a save.

| Column        | Type     | Description                              |
|---------------|----------|------------------------------------------|
| `id`          | INTEGER  | Auto-incrementing primary key            |
| `player_name` | TEXT     | Name entered at game start               |
| `score`       | INTEGER  | Final score at time of save              |
| `moves`       | INTEGER  | Number of tile slides made               |
| `statement`   | TEXT     | Player's written comment (≥ 30 words)    |
| `board_state` | TEXT     | Full 6×6 grid as JSON                    |
| `date`        | TEXT     | ISO 8601 timestamp of the save           |
| `created_at`  | DATETIME | Row insertion time (set by D1)           |

### `admin_users`

One row per admin account (currently one supported).

| Column          | Type | Description              |
|-----------------|------|--------------------------|
| `username`      | TEXT | Primary key              |
| `password_hash` | TEXT | PBKDF2-SHA256 hex digest |
| `salt`          | TEXT | Random 16-byte hex salt  |

### `admin_sessions`

Active login sessions.

| Column       | Type     | Description              |
|--------------|----------|--------------------------|
| `token`      | TEXT     | 32-byte random hex token |
| `expires_at` | DATETIME | Session expiry (7 days)  |
| `created_at` | DATETIME | Login time               |

### `app_settings`

Key/value store for editable content.

| Key          | Value                                                              |
|--------------|--------------------------------------------------------------------|
| `words`      | Full word list as a JSON array of `{text, category}` objects       |
| `categories` | Category map as a JSON object of `{key: {label, color}}` entries   |
| `tagline`    | Header tagline string                                              |
| `about`      | About page content (Markdown)                                      |

Query examples:

```bash
# Recent game sessions
npx wrangler d1 execute tilecraft-db --command \
  "SELECT id, player_name, score, moves, date FROM game_sessions ORDER BY created_at DESC LIMIT 20;"

# Current word count
npx wrangler d1 execute tilecraft-db --command \
  "SELECT json_array_length(value) FROM app_settings WHERE key = 'words';"

# List categories
npx wrangler d1 execute tilecraft-db --command \
  "SELECT value FROM app_settings WHERE key = 'categories';"
```

---

## Environment variables

Set in Cloudflare Pages → Settings → Environment variables.

| Variable         | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `ALLOWED_ORIGIN` | If set, API requests whose `Origin` header doesn't match return 403. Set to your Pages URL (e.g. `https://tilecraft-game.pages.dev`). Absent in local dev — all origins pass. |
