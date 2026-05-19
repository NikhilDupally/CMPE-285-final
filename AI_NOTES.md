# AI Usage Write-up — PawSwipe

## Which parts did Claude write end-to-end?

Claude scaffolded nearly all of the initial code: the Express server with all four API endpoints, the JSON file persistence layer, the React component tree (App, SwipeDeck, SwipeCard, ResultsView), the CSS, and the seed script that fetches breed data from the Dog CEO API. For the stretch goals, Claude also generated the UsernameModal, MatchesView, and AdminPage components and the analytics/undo backend logic in one pass. The swipe gesture engine in SwipeCard — tracking pointer/touch start position, computing rotation from drag distance, flying off-screen on threshold — was written by Claude and required only minor review.

## Where I had to push back or fix Claude's output

The clearest example was the bottom nav not responding to taps. Claude introduced a state variable named `history` (the undo stack) in App.jsx, then later wrote a `navigate()` function that called `history.replaceState(null, '', ' ')` to clean the URL hash. Because `history` resolved to the array, not `window.history`, every nav tap threw a silent `TypeError` before `setView` could run. Claude did not catch this during code generation — it only surfaced when I tested the UI and reported the symptom. I identified the shadowing, told Claude the specific bug, and had it apply the one-line fix (`window.history.replaceState`). A second layout bug — the bottom nav scrolling off screen — came from Claude choosing `min-height: 100vh` for the app container, which allowed the flex column to grow past the viewport. I noticed this while testing the Results tab and directed Claude to switch to `height: 100dvh`. Both bugs were caused by Claude not simulating actual runtime behavior, only writing syntactically valid code.

## One thing Claude did better than expected; one thing worse

**Better:** The seed script was more complete than I anticipated. Claude not only generated the API fetch loop but wrote breed-specific descriptions and fun facts for ~40 popular breeds, with a reasonable fallback for the rest, all in one shot. It also handled the `main/sub-breed` API key format (e.g., `retriever/golden` → display name "Golden Retriever") and rate-limited requests with a polite 80 ms delay.

**Worse:** Claude consistently over-trusted its own output and did not proactively test edge cases. The `better-sqlite3` native compilation failure on Node 23 (the original persistence choice) was something Claude should have flagged as a known risk given the Node version and path-with-spaces environment — it didn't; it only pivoted after the `npm install` error appeared. More broadly, Claude never said "you should manually verify the nav works in a browser before committing" — that responsibility stayed with me.

## Other AI tools

None used alongside Claude in this project. All code generation, debugging iteration, and design decisions were done through this Claude Code session.
