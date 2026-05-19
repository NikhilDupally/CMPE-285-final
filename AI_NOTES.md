# AI Usage Write-up — PawSwipe

## 1. Which parts did Claude write end-to-end?

### Backend
Claude wrote the entire backend from scratch in a single pass. This included the Express server (`server.js`) with all API endpoints — `GET /api/items`, `POST /api/vote`, `GET /api/results`, `GET /api/votes/:sessionId` — along with input validation on every parameter (type checks, length limits, allowlist for `choice`). The persistence layer (`db.js`) was designed by Claude as a JSON file store with atomic temp-file-rename writes, chosen after `better-sqlite3` failed to compile (see Section 2). Claude also wrote the seed script (`seed.js`) that calls the Dog CEO API, flattens the breed map including sub-breeds, fetches a random image URL per breed, and inserts 110 items with a polite 80 ms delay between requests. For the stretch goals, Claude extended the backend with `DELETE /api/votes/:sessionId/:itemId` (undo), `GET /api/analytics` (total swipes, sessions, avg decision time, last-24h count), and `POST /api/admin/items` (key-authenticated item creation).

### Frontend
Claude generated the full React + Vite frontend. The core swipe gesture engine in `SwipeCard.jsx` — tracking `mousedown`/`touchstart` start coordinates, computing live `translateX` + `rotate` transforms, showing color-tinted overlays and ADOPT/PASS stamps proportional to drag progress, committing or snapping back on release — was written by Claude without requiring edits to the logic. Claude also wrote the CSS Grid card-stack approach (all cards share one `grid-area: 1/1` so the container never collapses to zero height, a subtlety that a naïve `position: absolute` approach would miss). The full CSS — mobile-first layout, progress bar, action buttons, results list, analytics strip, modal animation — was generated in one shot and needed only two targeted fixes.

For the stretch goals, Claude built five additional components — `UsernameModal`, `MatchesView`, `AdminPage` — and wired up the undo history stack, the undone-item re-queue logic (so an undone card reappears at the front of the deck, not in its alphabetical position), the 10-second results polling with an animated Live badge, and the decision-time tracking pipeline from `SwipeCard` → `POST /api/vote` → analytics.

### Architectural decisions Claude proposed (that I accepted)
- **JSON file over SQLite** — after the native compilation failure, Claude proposed using a plain JSON file with atomic writes, citing the spec's explicit allowance for "a JSON file with proper locking." I evaluated this and agreed it was the right call for a local demo.
- **CSS Grid card stack** — Claude explained that `position: absolute` children collapse their parent's height to zero, and proposed CSS Grid with `grid-area: 1/1` as a clean alternative. I verified this reasoning was correct before accepting it.
- **Session identity via `crypto.randomUUID()` in localStorage** — Claude proposed this to satisfy the stretch goal (cross-reload persistence) without backend complexity. I confirmed this was the simplest acceptable approach.

---

## 2. Where I had to push back, fix, or rewrite Claude's output

### Bug 1 — Variable shadowing broke all nav taps (concrete example)
When implementing the stretch goals, Claude introduced `const [history, setHistory] = useState([])` as the undo stack. Later, in the `navigate()` function, it wrote:

```js
else if (window.location.hash === '#admin') history.replaceState(null, '', ' ');
```

This called `.replaceState` on the React state array, not `window.history`. The `TypeError` was swallowed silently, which meant `setView` never ran — every tap on the bottom nav bar appeared to do nothing. Claude did not detect this at generation time. I caught it by testing the UI, described the symptom ("bottom nav clicks not working"), and identified the root cause myself. The fix was one character change: `window.history.replaceState(...)`. This is a good example of Claude producing syntactically valid but semantically broken code that only manifests at runtime.

### Bug 2 — Bottom nav scrolled off screen
Claude used `min-height: 100vh` on the `.app` container. This allows the flex column to grow taller than the viewport when content is long, which means the page scrolls as a whole and the bottom nav ends up below the fold. I caught this while testing the Results tab (which has a long scrollable list). I directed Claude to change it to `height: 100dvh`, which locks the container to exactly the viewport and forces inner components to handle their own scroll — the correct pattern for a fixed-chrome mobile layout.

### Bug 3 — `item_id` vs `itemId` mismatch
The `GET /api/votes/:sessionId` endpoint returned vote objects with the key `itemId` (the internal storage field name), but `App.jsx` read `v.item_id` when rebuilding the voted map on load. This meant a user's previous votes were invisible after a page reload — every item appeared unvoted. I noticed this during end-to-end testing when the progress counter showed 0 after a reload despite having voted earlier. Claude had not caught the inconsistency because the client and server code were generated in separate passes. I pointed out the mismatch and Claude added a `.map()` in the server endpoint to normalize `itemId` → `item_id` before sending the response.

### Design override — header layout
Claude's initial header packed the logo, username pill badge, and three tab buttons into a single 60px flex row. On a real 390px mobile viewport this clipped the "Results" tab label. I flagged this as too cluttered and directed Claude to move the tabs to a bottom navigation bar — the standard mobile pattern — and replace the username pill with a compact avatar circle. Claude implemented this correctly on the first attempt once given the direction.

---

## 3. One thing Claude did better than expected; one thing worse

**Better — seed data quality and API handling**

I expected Claude to produce a minimal seed script that called the API and stored raw data. Instead it:
- Wrote breed-specific descriptions and fun facts for ~40 of the most recognisable breeds (Labrador, Golden Retriever, Corgi, etc.) with genuinely useful content, not filler.
- Handled the Dog CEO API's nested `main/sub-breed` key structure (e.g., `terrier/yorkshire`) and generated correct human-readable display names ("Yorkshire Terrier") via a formatting helper.
- Added a polite 80 ms sleep between API calls without being asked.
- Made the script idempotent (`INSERT OR REPLACE`) so it could be re-run safely.

This saved meaningful time compared to writing seed data by hand.

**Worse — no proactive risk flagging**

Claude's biggest weakness was assuming its chosen stack would work without checking environmental constraints. It selected `better-sqlite3` as the database without considering that (a) the project path contains spaces (`Course work/Sem 3/…`) and (b) the environment runs Node 23, for which `better-sqlite3` v9 has no prebuilt binaries and whose native compilation fails because the generated Makefile doesn't quote paths with spaces. The full `npm install` error had to appear before Claude reconsidered the choice. A more careful assistant would have asked "what Node version are you on?" or noted that native modules on unusual paths are risky before committing to that dependency. More generally, Claude never prompted me to test the app in a browser between major changes — it reported "the build succeeds" as a proxy for "the feature works," which are very different things.

---

## 4. Architectural calls I made (with Claude's input)

| Decision | Options Claude presented | My call | Reason |
|---|---|---|---|
| Persistence | SQLite (better-sqlite3), JSON file, lowdb, Firebase | JSON file | No native compilation, zero extra deps, spec-allowed, sufficient for local demo |
| Frontend framework | React + Vite, Vue, Svelte, vanilla JS | React + Vite | Fastest iteration speed for component-heavy UI |
| Gesture library | Framer Motion, react-use-gesture, vanilla events | Vanilla events | Avoids 30 kB dependency; the drag pattern is simple enough to own directly |
| Session identity | Anonymous UUID (localStorage), email magic link, OAuth | localStorage UUID | Satisfies cross-reload stretch goal with zero backend work |
| Dedup strategy | Unique constraint (DB-level), application-level check, last-write-wins | Last-write-wins upsert | Allows vote changes, no double-count, simple to reason about |

---

## 5. Other AI tools

None used alongside Claude in this project. All code generation, debugging, iteration, and design decisions were handled within this Claude Code session.
