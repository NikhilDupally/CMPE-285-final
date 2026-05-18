# PawSwipe 🐾

A mobile-first swipe-to-vote app for dog breed adoption.  
Users swipe right to **Adopt** or left to **Pass** on 110 dog breeds.  
Aggregate results are visible in real-time via the Results tab.

---

## Voting Theme

**Adoptable Dog Breeds** — because every pup deserves a home.  
Each card shows a real photo (from the [Dog CEO API](https://dog.ceo/dog-api/)),
the breed name, a one-sentence description, and a fun fact.

---

## Quick Start

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Seed the database (one-time, requires internet)

```bash
cd server && node seed.js
```

This fetches 110 breed image URLs from the Dog CEO API and stores them in
`server/data.json`. Re-running is safe — it uses upsert semantics.

### 3. Start the backend

```bash
cd server && node server.js
# → http://localhost:3001
```

### 4. Start the frontend

```bash
cd client && npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in a browser (works on mobile too via the
Network URL printed by Vite).

---

## Architecture

```
CMPE-285-final/
├── server/
│   ├── server.js      — Express API (4 endpoints)
│   ├── db.js          — JSON file persistence layer
│   ├── seed.js        — Seed script (Dog CEO API → data.json)
│   └── data.json      — Generated: items + votes (source of truth)
└── client/
    ├── src/
    │   ├── App.jsx              — Session ID, data fetching, view routing
    │   ├── components/
    │   │   ├── SwipeDeck.jsx    — Card stack + progress + buttons
    │   │   ├── SwipeCard.jsx    — Drag logic, stamps, tint overlays
    │   │   └── ResultsView.jsx  — Sortable results list
    │   └── index.css            — Mobile-first styles
    └── vite.config.js           — /api → localhost:3001 proxy
```

**Backend**: Node.js + Express, no native dependencies (runs on any Node 18+).  
Persistence is a JSON file (`data.json`) with atomic writes via a temp-file
rename pattern. Node's single-threaded event loop prevents write races for
this single-process local deployment.

**Frontend**: React 18 + Vite. No state-management library — plain `useState`
and `useCallback`. Gestures are implemented from scratch using
`mouse{down,move,up}` and `touch{start,move,end}` events attached to
`document` so drags that stray outside the card don't break mid-swipe.
Cards are stacked via CSS Grid (same `grid-area`), which gives the stacked
peek effect without collapsing the container height.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/items` | All 110 breed items |
| `POST` | `/api/vote` | `{ itemId, choice: "yes"\|"no", sessionId }` |
| `GET`  | `/api/results` | Aggregate yes/no counts per item |
| `GET`  | `/api/votes/:sessionId` | Votes cast by a given session |

### Idempotency

`POST /api/vote` uses a composite key `(sessionId, itemId)`. A second vote
from the same session on the same item **updates** the choice rather than
creating a new record — no double-counting.

---

## Trade-offs Made Under Time Pressure

| Decision | Choice | Why |
|----------|--------|-----|
| Persistence | JSON file | `better-sqlite3` requires native compilation and failed on Node 23 + a path with spaces; JSON file is explicitly allowed by spec and is sufficient for local demo scale |
| Gesture library | None (vanilla) | Avoids a 30 kB dependency; the drag-to-decision pattern is simple enough to implement directly in ~60 lines |
| Session identity | `crypto.randomUUID()` stored in `localStorage` | Satisfies the stretch goal (cross-reload identity) with zero backend complexity |
| Results refresh | On-demand (refresh button) | Simpler than polling; real-time updates are a stretch goal |
| Image fallback | `placedog.net` | Dog CEO images occasionally 404; placedog provides a consistent fallback |

---

## Data Source & Credits

Dog photos and breed list: **[Dog CEO / Dog API](https://dog.ceo/dog-api/)**  
(MIT-licensed open API, free to use)  
Image fallback: **[placedog.net](https://placedog.net)**
