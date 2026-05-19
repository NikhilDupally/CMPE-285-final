/**
 * JSON-file persistence layer.
 * Writes are atomic (temp-file rename). Node's single-threaded event loop
 * prevents concurrent write races for this local, single-process deployment.
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
  // ── items ──────────────────────────────────────────────────────────
  allItems() {
    return Object.values(state.items).sort((a, b) => a.name.localeCompare(b.name));
  },

  upsertItem(item) {
    state.items[item.id] = item;
    save();
  },

  itemExists(id) {
    return Boolean(state.items[id]);
  },

  // ── votes ──────────────────────────────────────────────────────────
  // Idempotent: voting again on the same (session, item) overwrites choice.
  upsertVote(sessionId, itemId, choice, decisionTimeMs) {
    const key = `${sessionId}|${itemId}`;
    state.votes[key] = {
      sessionId,
      itemId,
      choice,
      decisionTimeMs: typeof decisionTimeMs === 'number' ? Math.round(decisionTimeMs) : null,
      ts: Date.now(),
    };
    save();
  },

  // Returns true if a vote existed and was removed.
  deleteVote(sessionId, itemId) {
    const key = `${sessionId}|${itemId}`;
    if (!state.votes[key]) return false;
    delete state.votes[key];
    save();
    return true;
  },

  votesBySession(sessionId) {
    return Object.values(state.votes).filter((v) => v.sessionId === sessionId);
  },

  // ── results ────────────────────────────────────────────────────────
  aggregateResults() {
    const allVotes = Object.values(state.votes);
    return Object.values(state.items).map((item) => {
      const iv = allVotes.filter((v) => v.itemId === item.id);
      const yes = iv.filter((v) => v.choice === 'yes').length;
      const no  = iv.filter((v) => v.choice === 'no').length;
      return { ...item, yes_count: yes, no_count: no, total_votes: iv.length };
    });
  },

  // ── analytics ──────────────────────────────────────────────────────
  getAnalytics() {
    const votes = Object.values(state.votes);
    const sessions = new Set(votes.map((v) => v.sessionId));
    const timings = votes.filter((v) => v.decisionTimeMs != null).map((v) => v.decisionTimeMs);
    const avgDecisionTimeMs =
      timings.length > 0
        ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length)
        : null;
    const now = Date.now();
    const votesLast24h = votes.filter((v) => now - v.ts < 86_400_000).length;

    return {
      totalSwipes: votes.length,
      totalSessions: sessions.size,
      avgDecisionTimeMs,
      votesLast24h,
    };
  },
};
