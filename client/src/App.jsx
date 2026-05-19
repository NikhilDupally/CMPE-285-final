import { useState, useEffect, useCallback } from 'react';
import SwipeDeck     from './components/SwipeDeck.jsx';
import ResultsView   from './components/ResultsView.jsx';
import MatchesView   from './components/MatchesView.jsx';
import UsernameModal from './components/UsernameModal.jsx';
import AdminPage     from './components/AdminPage.jsx';

const POLL_MS = 10_000; // refresh results every 10 s when on Results/Matches

function getSessionId() {
  let id = localStorage.getItem('pawswipe_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pawswipe_session', id);
  }
  return id;
}

function getInitialView() {
  return window.location.hash === '#admin' ? 'admin' : 'swipe';
}

export default function App() {
  const [view, setView]             = useState(getInitialView);
  const [items, setItems]           = useState([]);
  const [results, setResults]       = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [votedMap, setVotedMap]     = useState({});         // { itemId: 'yes'|'no' }
  const [history, setHistory]       = useState([]);         // [{ itemId, item, choice }]
  const [undoneQueue, setUndoneQueue] = useState([]);       // items re-queued by undo
  const [loading, setLoading]       = useState(true);
  const [isLive, setIsLive]         = useState(false);
  const [sessionId]                 = useState(getSessionId);
  const [username, setUsername]     = useState(
    () => localStorage.getItem('pawswipe_username') ?? ''
  );
  const [showModal, setShowModal]   = useState(
    () => !localStorage.getItem('pawswipe_username')
  );

  // ── initial load ───────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch(`/api/votes/${sessionId}`).then((r) => r.json()),
      fetch('/api/results').then((r) => r.json()),
      fetch('/api/analytics').then((r) => r.json()),
    ])
      .then(([itemsData, votesData, resultsData, analyticsData]) => {
        setItems(itemsData.items ?? []);
        const map = {};
        for (const v of votesData.votes ?? []) map[v.item_id] = v.choice;
        setVotedMap(map);
        setResults(resultsData.results ?? []);
        setAnalytics(analyticsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // ── poll results when not on swipe tab ─────────────────────────
  const refreshResults = useCallback(() => {
    Promise.all([
      fetch('/api/results').then((r)  => r.json()),
      fetch('/api/analytics').then((r) => r.json()),
    ]).then(([r, a]) => {
      setResults(r.results ?? []);
      setAnalytics(a);
      setIsLive(true);
      setTimeout(() => setIsLive(false), 1500);
    });
  }, []);

  useEffect(() => {
    if (view === 'swipe' || view === 'admin') return;
    refreshResults();
    const id = setInterval(refreshResults, POLL_MS);
    return () => clearInterval(id);
  }, [view, refreshResults]);

  // ── vote ───────────────────────────────────────────────────────
  const handleVote = useCallback(
    async (itemId, choice, decisionTimeMs) => {
      const item = items.find((i) => i.id === itemId);
      setHistory((h) => [...h.slice(-49), { itemId, item, choice }]); // cap at 50
      setVotedMap((m) => ({ ...m, [itemId]: choice }));
      setUndoneQueue((q) => q.filter((i) => i.id !== itemId));

      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, choice, sessionId, decisionTimeMs }),
      });
    },
    [items, sessionId]
  );

  // ── undo ───────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setVotedMap((m) => { const n = { ...m }; delete n[last.itemId]; return n; });
    setUndoneQueue((q) => [last.item, ...q]);
    await fetch(`/api/votes/${sessionId}/${last.itemId}`, { method: 'DELETE' });
  }, [history, sessionId]);

  // ── username modal ─────────────────────────────────────────────
  const handleSaveUsername = useCallback((name) => {
    if (name) {
      localStorage.setItem('pawswipe_username', name);
      setUsername(name);
    } else {
      localStorage.setItem('pawswipe_username', '');
    }
    setShowModal(false);
  }, []);

  // ── derived deck ───────────────────────────────────────────────
  const undoneIds    = new Set(undoneQueue.map((i) => i.id));
  const pendingItems = [
    ...undoneQueue,
    ...items.filter((i) => !(i.id in votedMap) && !undoneIds.has(i.id)),
  ];
  const votedCount = Object.keys(votedMap).length;

  // ── nav ────────────────────────────────────────────────────────
  function navigate(v) {
    if (v === 'admin') window.location.hash = 'admin';
    else if (window.location.hash === '#admin') history.replaceState(null, '', ' ');
    setView(v);
  }

  const NAV = [
    { view: 'swipe',   icon: '🐾', label: 'Swipe'   },
    { view: 'matches', icon: '♥',  label: 'Matches' },
    { view: 'results', icon: '≡',  label: 'Results' },
  ];

  const avatarInitial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="app">
      {showModal && <UsernameModal onSave={handleSaveUsername} />}

      <header className="app-header">
        <div className="logo" onClick={() => navigate('swipe')}>
          <span className="logo-paw">🐾</span>
          <span className="logo-text">PawSwipe</span>
        </div>
        <div className="header-actions">
          <button
            className="avatar-btn"
            onClick={() => setShowModal(true)}
            title={username || 'Set your name'}
          >
            {avatarInitial}
          </button>
          <button
            className={`avatar-btn avatar-btn--gear${view === 'admin' ? ' active' : ''}`}
            onClick={() => navigate(view === 'admin' ? 'swipe' : 'admin')}
            title="Admin"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>Loading pups…</p>
          </div>
        ) : view === 'swipe' ? (
          <SwipeDeck
            items={pendingItems}
            total={items.length}
            votedCount={votedCount}
            onVote={handleVote}
            onViewResults={() => navigate('results')}
            onUndo={handleUndo}
            canUndo={history.length > 0}
          />
        ) : view === 'matches' ? (
          <MatchesView
            items={items}
            votedMap={votedMap}
            results={results}
            isLive={isLive}
          />
        ) : view === 'admin' ? (
          <AdminPage />
        ) : (
          <ResultsView
            results={results}
            analytics={analytics}
            onRefresh={refreshResults}
            isLive={isLive}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {NAV.map(({ view: v, icon, label }) => (
          <button
            key={v}
            className={`nav-tab${view === v ? ' nav-tab--active' : ''}`}
            onClick={() => navigate(v)}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
