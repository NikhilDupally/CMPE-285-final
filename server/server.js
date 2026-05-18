const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const db      = require('./db');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// ── GET /api/items ─────────────────────────────────────────────
app.get('/api/items', (_req, res) => {
  const items = db.allItems();
  res.json({ items, count: items.length });
});

// ── POST /api/vote ─────────────────────────────────────────────
// Idempotent: a session voting again on the same item just updates the choice.
app.post('/api/vote', (req, res) => {
  const { itemId, choice, sessionId } = req.body ?? {};

  if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
    return res.status(400).json({ error: 'Invalid itemId' });
  }
  if (!['yes', 'no'].includes(choice)) {
    return res.status(400).json({ error: 'choice must be "yes" or "no"' });
  }
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }
  if (!db.itemExists(itemId)) {
    return res.status(404).json({ error: 'Item not found' });
  }

  db.upsertVote(sessionId, itemId, choice);
  res.json({ success: true });
});

// ── GET /api/results ───────────────────────────────────────────
app.get('/api/results', (_req, res) => {
  const results = db.aggregateResults();
  res.json({ results });
});

// ── GET /api/votes/:sessionId ──────────────────────────────────
app.get('/api/votes/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || sessionId.length > 200) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }
  const votes = db
    .votesBySession(sessionId)
    .map(({ itemId, choice }) => ({ item_id: itemId, choice }));
  res.json({ votes });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`PawSwipe server running on http://localhost:${PORT}`)
);
