# Tilecraft

Tilecraft is a Serious Game for Participatory Brainstorming

[Tilecraft concept & facilitation guide](tilecraft.md)

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
│           ├── setup.js     # POST /api/admin/setup (first-run only, legacy)
│           ├── login.js     # POST /api/admin/login
│           ├── logout.js    # POST /api/admin/logout
│           ├── me.js        # GET /api/admin/me
│           ├── scores.js    # GET /api/admin/scores
│           ├── words.js     # GET/PUT /api/admin/words
│           ├── categories.js# GET/PUT /api/admin/categories
│           ├── settings.js  # GET/PUT /api/admin/settings
│           ├── users.js     # GET/POST /api/admin/users
│           ├── scores/
│           │   └── [id].js  # DELETE /api/admin/scores/:id
│           └── users/
│               └── [username].js  # DELETE/PUT /api/admin/users/:username
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

The admin panel lives at `/admin/`. On first login the default admin account is created automatically — no setup step required.

**Default credentials:**
- Username: `admin`
- Password: `tileministrator`

Change the password immediately after first login via the **Users** tab.

### Logging in

Open `/admin/` in your browser and sign in with the credentials above.

### What the admin can do

| Tab | Actions |
|-----|---------|
| **Scores** | Browse all saved game sessions; delete individual entries (with confirmation) |
| **Words** | Add or remove words, set their category, load the bundled defaults, save to D1. Also manage categories: edit label and colour, add new categories, delete unused ones |
| **Settings** | Edit the header tagline; write an About page in Markdown |
| **Users** | Create new admin accounts, set passwords for any admin, delete admins (cannot delete your own account or the last remaining admin) |

Changes to words and settings take effect immediately for all visitors — no redeployment needed.

### Authentication details

- Passwords are hashed with **PBKDF2-SHA256** (100 000 iterations, random per-user salt) via the Web Crypto API.
- Sessions are stored in D1 and expire after **7 days**. The session token is sent as an **HttpOnly, SameSite=Strict** cookie.
- Deleting an admin account immediately invalidates all of their active sessions.

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

One row per admin account.

| Column          | Type | Description              |
|-----------------|------|--------------------------|
| `username`      | TEXT | Primary key              |
| `password_hash` | TEXT | PBKDF2-SHA256 hex digest |
| `salt`          | TEXT | Random 16-byte hex salt  |

### `admin_sessions`

Active login sessions.

| Column       | Type     | Description                    |
|--------------|----------|--------------------------------|
| `token`      | TEXT     | 32-byte random hex token       |
| `username`   | TEXT     | Admin who owns this session    |
| `expires_at` | DATETIME | Session expiry (7 days)        |
| `created_at` | DATETIME | Login time                     |

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

## Migrating an existing database

If you deployed before user management was added, run this once to add the `username` column to active sessions:

```bash
# Local
npx wrangler d1 execute tilecraft-db --local \
  --command="ALTER TABLE admin_sessions ADD COLUMN username TEXT NOT NULL DEFAULT ''"

# Production
npx wrangler d1 execute tilecraft-db \
  --command="ALTER TABLE admin_sessions ADD COLUMN username TEXT NOT NULL DEFAULT ''"
```

---

## Environment variables

Set in Cloudflare Pages → Settings → Environment variables.

| Variable         | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `ALLOWED_ORIGIN` | If set, API requests whose `Origin` header doesn't match return 403. Set to your Pages URL (e.g. `https://tilecraft-game.pages.dev`). Absent in local dev — all origins pass. |
