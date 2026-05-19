# PawSwipe 🐾

A mobile-first swipe-to-vote app for dog breed adoption.
Swipe right to **Adopt**, left to **Pass** on 110 dog breeds.
Aggregate results update in real-time across all users.

**Demo video:** https://youtu.be/2dVPsKJWA0w

---

## Table of Contents

1. [Install & Run](#install--run)
2. [Architecture](#architecture)
3. [Requirements Completed](#requirements-completed)
4. [Known Issues](#known-issues)
5. [AI Usage](#ai-usage)

---

## Install & Run

### Prerequisites
- Node.js 18+ (tested on Node 23)
- npm
- Internet connection for the one-time seed step

### 1. Clone the repo

```bash
git clone https://github.com/NikhilDupally/CMPE-285-final.git
cd CMPE-285-final
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Seed the database (one-time)

Fetches 110 dog breed image URLs from the [Dog CEO API](https://dog.ceo/dog-api/) and writes them to `server/data.json`.

```bash
cd server && node seed.js
```

Expected output: `Done — 110 seeded, 0 failed.`

### 4. Start the backend

```bash
cd server && node server.js
# → http://localhost:3001
```

### 5. Start the frontend

```bash
cd client && npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in a browser.
For a realistic mobile view, open Chrome DevTools → toggle device toolbar → iPhone 15 (390 × 844).

The Network URL printed by Vite (e.g. `http://10.0.0.x:5173`) works on a phone on the same Wi-Fi network.

### Admin panel

Navigate to `http://localhost:5173/#admin` or tap the ⚙ icon in the header.
Default admin key: `pawswipe` (override with `ADMIN_KEY=yourkey node server.js`).

---

## Architecture

```
CMPE-285-final/
├── server/
│   ├── server.js      — Express API (6 endpoints)
│   ├── db.js          — JSON file persistence layer
│   ├── seed.js        — Seed script (Dog CEO API → data.json)
│   └── data.json      — Source of truth: items + votes
└── client/
    ├── src/
    │   ├── App.jsx                    — Session ID, data fetching, routing
    │   ├── components/
    │   │   ├── SwipeDeck.jsx          — Card stack, progress, action buttons
    │   │   ├── SwipeCard.jsx          — Drag/touch gesture engine
    │   │   ├── ResultsView.jsx        — Sortable results + analytics strip
    │   │   ├── MatchesView.jsx        — Personal matches with threshold slider
    │   │   ├── UsernameModal.jsx      — First-visit onboarding modal
    │   │   └── AdminPage.jsx          — Add new items without code changes
    │   └── index.css                  — Mobile-first styles
    └── vite.config.js                 — /api proxy → localhost:3001
```

### Backend

Node.js + Express, no native dependencies (runs on any Node 18+).
Persistence is a flat JSON file (`server/data.json`) with **atomic writes** via a temp-file rename pattern. Node's single-threaded event loop prevents concurrent write races for this single-process local deployment.

Idempotency is enforced at the application layer: votes are keyed by `sessionId|itemId`. A second vote from the same session on the same item **overwrites** the choice rather than inserting a new record — no double-counting.

### Frontend

React 18 + Vite. No external state-management or gesture library.
Swipe gestures are implemented with vanilla `mouse*` / `touch*` events attached to `document` (so drags that stray outside the card boundary don't break mid-swipe).
Cards are stacked with CSS Grid (`grid-area: 1/1`) so the container never collapses to zero height — a known pitfall with `position: absolute` stacking.
The app shell uses `height: 100dvh` so the bottom navigation bar is always anchored to the viewport regardless of content length.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`    | `/api/items`                       | All 110 breed items |
| `POST`   | `/api/vote`                        | `{ itemId, choice, sessionId, decisionTimeMs }` |
| `DELETE` | `/api/votes/:sessionId/:itemId`    | Undo a vote |
| `GET`    | `/api/results`                     | Aggregate yes/no counts per item |
| `GET`    | `/api/votes/:sessionId`            | Votes cast by a given session |
| `GET`    | `/api/analytics`                   | Total swipes, sessions, avg decision time, last-24h |
| `POST`   | `/api/admin/items`                 | Add/replace an item (`X-Admin-Key` required) |

---

## Requirements Completed

### Core (3.1)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Voting theme documented | ✅ Dog breed adoption — "Adopt" or "Pass" |
| 2 | ≥ 100 distinct items with image and label | ✅ 110 breeds, real photos from Dog CEO API |
| 3 | Swipe right = yes vote | ✅ |
| 4 | Swipe left = no vote | ✅ |
| 5 | Visual feedback during gesture (tilt, color, threshold) | ✅ Card rotates, green/red tint overlay, ADOPT/PASS stamp |
| 6 | Smooth transition to next card after vote | ✅ Card flies off screen in swipe direction |
| 7 | Results view with aggregate yes/no counts across all users | ✅ Results tab with per-item counts and percentage bar |
| 8 | Results sortable/filterable in at least one way | ✅ Four sort modes: Most Loved, Most Divisive, Most Voted, Least Voted |
| 9 | Votes persisted to a backend | ✅ Express + JSON file, source of truth on server |
| 10 | localStorage used only as cache, not source of truth | ✅ Session ID and username in localStorage; votes in `data.json` |
| 11 | Idempotency / dedup — single user voting twice doesn't double-count | ✅ Upsert keyed by `sessionId\|itemId` |
| 12 | End-of-deck state handled gracefully | ✅ "You've reviewed all 110 pups!" screen with link to Results |
| 13 | Must work on 390 × 844 viewport | ✅ Tested in Chrome DevTools iPhone 15 preset |
| 14 | Touch gestures on mobile; mouse drag on desktop | ✅ Both event sets wired with `document`-level listeners |
| 15 | No console errors on happy path | ✅ |
| 16 | Basic input validation on backend | ✅ Type checks, length limits, allowlist for `choice` |

### Stretch (3.2)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | User identity remembered across reloads | ✅ `crypto.randomUUID()` session ID + optional display name in localStorage |
| 2 | Undo last swipe | ✅ ↩ button — removes server vote, re-queues card at front of deck |
| 3 | Matches view | ✅ Items user voted ♥ where global yes-rate ≥ adjustable threshold |
| 4 | Real-time updating of aggregate counts | ✅ Polls `/api/results` every 10 s on Results/Matches tabs; animated Live badge |
| 5 | Admin / seed script to add new items without code changes | ✅ `POST /api/admin/items` with `X-Admin-Key` header + AdminPage UI |
| 6 | Basic analytics | ✅ Decision time tracked per swipe; `/api/analytics` returns total swipes, sessions, avg decision time, last-24h count |

---

## Known Issues

| Issue | Detail |
|-------|--------|
| **Images occasionally 404** | Dog CEO CDN URLs are stable but not guaranteed forever. The app falls back to `placedog.net` for broken images. |
| **No HTTPS** | Runs over plain HTTP on localhost. PWA install and some mobile browser features require HTTPS in production. |
| **Single-process JSON writes** | The atomic rename pattern is safe for one Node process. Running multiple server instances behind a load balancer would require a proper database. |
| **Session votes lost on data.json delete** | If `server/data.json` is deleted and re-seeded, all vote history is cleared. Items get new content but the same IDs, so old session votes would re-associate if the file were restored. |
| **Admin key in plaintext** | The `ADMIN_KEY` is passed as a request header. Fine for a local demo; a production deployment would need HTTPS and a secrets manager. |
| **No pagination on results** | All 110 items are returned in a single response. At this scale it is instant, but would need pagination for thousands of items. |

---

## AI Usage

See [AI_NOTES.md](./AI_NOTES.md) for the full write-up covering:
- Which parts Claude wrote end-to-end
- Concrete bugs I caught and fixed in Claude's output
- One thing Claude did better than expected, one thing worse
- Architectural decisions I made with Claude's input
