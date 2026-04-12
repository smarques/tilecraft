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
├── data/
│   ├── words.json           # Word list
│   └── categories.json      # Category definitions and tile colours
├── locales/
│   └── en.json              # English UI strings
├── functions/
│   ├── schema.sql           # D1 table definition
│   └── api/
│       └── save-game.js     # POST /api/save-game — Pages Function
└── wrangler.toml            # Cloudflare Pages + D1 binding config
```

---

## Local development

```bash
npm install          # install test dependencies
npm test             # run the test suite (Vitest)
npm run test:watch   # watch mode
```

For a full local preview including the Pages Function and D1:

```bash
npx wrangler pages dev .
```

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

```bash
npx wrangler d1 execute tilecraft-db --file=functions/schema.sql
```

**3. Deploy**

```bash
npx wrangler pages deploy .
```

---

## Database

Sessions are saved to the `game_sessions` table in Cloudflare D1 whenever a player confirms a save.

| Column        | Type    | Description                              |
|---------------|---------|------------------------------------------|
| `id`          | INTEGER | Auto-incrementing primary key            |
| `player_name` | TEXT    | Name entered at game start               |
| `score`       | INTEGER | Final score at time of save              |
| `moves`       | INTEGER | Number of tile slides made               |
| `statement`   | TEXT    | Player's written comment (≥ 30 words)    |
| `board_state` | TEXT    | Full 6×6 grid as JSON                    |
| `date`        | TEXT    | ISO 8601 timestamp of the save           |
| `created_at`  | DATETIME| Row insertion time (set by D1)           |

Query saved sessions:

```bash
npx wrangler d1 execute tilecraft-db --command "SELECT id, player_name, score, moves, date FROM game_sessions ORDER BY created_at DESC LIMIT 20;"
```

 The function reads env.ALLOWED_ORIGIN. If it's set and the request's Origin header doesn't match exactly, it returns 403    
  without touching the database. Set it in Cloudflare Pages → Settings → Environment variables:                               
                                                                                                                              
  ALLOWED_ORIGIN = https://tilecraft-game.pages.dev                                                                           
                                                                                                                              
  During local dev the variable is absent, so all origins pass through.   
