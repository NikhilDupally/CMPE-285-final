/**
 * Tiny JSON-file persistence layer.
 *
 * All writes go through save(), which atomically replaces the file via a
 * temp-then-rename pattern.  Node's single-threaded event loop ensures
 * synchronous reads/writes don't race each other for this local demo.
 *
 * Trade-off vs SQLite: no query planner, entire file is read on startup,
 * but for ≤200 items and thousands of votes this is well within RAM limits
 * and file I/O is fast on local disk.
 */

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(DB_FILE)) return { items: {}, votes: {} };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

const state = load();

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, DB_FILE);
}

module.exports = {
  // ── items ─────────────────────────────────────────────────
  allItems() {
    return Object.values(state.items).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },

  upsertItem(item) {
    state.items[item.id] = item;
    save();
  },

  itemExists(id) {
    return Boolean(state.items[id]);
  },

  // ── votes ─────────────────────────────────────────────────
  // Idempotent: voting twice just overwrites the previous choice.
  upsertVote(sessionId, itemId, choice) {
    const key = `${sessionId}|${itemId}`;
    state.votes[key] = { sessionId, itemId, choice, ts: Date.now() };
    save();
  },

  votesBySession(sessionId) {
    return Object.values(state.votes).filter((v) => v.sessionId === sessionId);
  },

  // ── results ───────────────────────────────────────────────
  aggregateResults() {
    const allVotes = Object.values(state.votes);
    return Object.values(state.items).map((item) => {
      const iv = allVotes.filter((v) => v.itemId === item.id);
      const yes = iv.filter((v) => v.choice === 'yes').length;
      const no  = iv.filter((v) => v.choice === 'no').length;
      return {
        ...item,
        yes_count:   yes,
        no_count:    no,
        total_votes: iv.length,
      };
    });
  },
};
