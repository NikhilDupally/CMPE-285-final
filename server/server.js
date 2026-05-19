const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const db      = require('./db');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// ── GET /api/items ─────────────────────────────────────────────────
app.get('/api/items', (_req, res) => {
  const items = db.allItems();
  res.json({ items, count: items.length });
});

// ── POST /api/vote ─────────────────────────────────────────────────
// Idempotent per (sessionId, itemId). Accepts optional decisionTimeMs.
app.post('/api/vote', (req, res) => {
  const { itemId, choice, sessionId, decisionTimeMs } = req.body ?? {};

  if (!itemId || typeof itemId !== 'string' || itemId.length > 200)
    return res.status(400).json({ error: 'Invalid itemId' });
  if (!['yes', 'no'].includes(choice))
    return res.status(400).json({ error: 'choice must be "yes" or "no"' });
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200)
    return res.status(400).json({ error: 'Invalid sessionId' });
  if (!db.itemExists(itemId))
    return res.status(404).json({ error: 'Item not found' });

  const dt =
    typeof decisionTimeMs === 'number' && decisionTimeMs > 0 && decisionTimeMs < 300_000
      ? decisionTimeMs
      : null;

  db.upsertVote(sessionId, itemId, choice, dt);
  res.json({ success: true });
});

// ── DELETE /api/votes/:sessionId/:itemId ───────────────────────────
// Undo a vote. Safe to call on a non-existent vote.
app.delete('/api/votes/:sessionId/:itemId', (req, res) => {
  const { sessionId, itemId } = req.params;
  if (!sessionId || sessionId.length > 200)
    return res.status(400).json({ error: 'Invalid sessionId' });
  if (!itemId || itemId.length > 200)
    return res.status(400).json({ error: 'Invalid itemId' });

  db.deleteVote(sessionId, itemId);
  res.json({ success: true });
});

// ── GET /api/results ───────────────────────────────────────────────
app.get('/api/results', (_req, res) => {
  res.json({ results: db.aggregateResults() });
});

// ── GET /api/votes/:sessionId ──────────────────────────────────────
app.get('/api/votes/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || sessionId.length > 200)
    return res.status(400).json({ error: 'Invalid sessionId' });

  const votes = db
    .votesBySession(sessionId)
    .map(({ itemId, choice }) => ({ item_id: itemId, choice }));
  res.json({ votes });
});

// ── GET /api/analytics ─────────────────────────────────────────────
app.get('/api/analytics', (_req, res) => {
  res.json(db.getAnalytics());
});

// ── POST /api/admin/items ──────────────────────────────────────────
// Adds or replaces an item. Requires X-Admin-Key header.
// Set ADMIN_KEY env var (default: "pawswipe").
app.post('/api/admin/items', (req, res) => {
  const adminKey    = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || 'pawswipe';

  if (!adminKey || adminKey !== expectedKey)
    return res.status(401).json({ error: 'Unauthorized — supply X-Admin-Key header' });

  const { id, name, breed_key, image_url, description, fun_fact } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 200)
    return res.status(400).json({ error: 'name is required (2-200 chars)' });
  if (!image_url || typeof image_url !== 'string' || !image_url.startsWith('http'))
    return res.status(400).json({ error: 'image_url must be an http(s) URL' });

  const itemId = id
    ? String(id).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100)
    : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);

  db.upsertItem({
    id:          itemId,
    name:        name.trim(),
    breed_key:   breed_key || itemId,
    image_url,
    description: description?.trim() || `A wonderful ${name.trim()} looking for a loving home`,
    fun_fact:    fun_fact?.trim()    || `${name.trim()}s make amazing companions!`,
  });

  res.json({ success: true, id: itemId });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`PawSwipe server running on http://localhost:${PORT}`)
);
