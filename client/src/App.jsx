import { useState, useEffect, useCallback } from 'react';
import SwipeDeck from './components/SwipeDeck.jsx';
import ResultsView from './components/ResultsView.jsx';

function getSessionId() {
  let id = localStorage.getItem('pawswipe_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pawswipe_session', id);
  }
  return id;
}

export default function App() {
  const [view, setView] = useState('swipe');
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  const [votedMap, setVotedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [sessionId] = useState(getSessionId);

  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch(`/api/votes/${sessionId}`).then((r) => r.json()),
    ])
      .then(([itemsData, votesData]) => {
        setItems(itemsData.items ?? []);
        const map = {};
        for (const v of votesData.votes ?? []) map[v.item_id] = v.choice;
        setVotedMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const fetchResults = useCallback(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []));
  }, []);

  useEffect(() => {
    if (view === 'results') fetchResults();
  }, [view, fetchResults]);

  const handleVote = useCallback(
    async (itemId, choice) => {
      setVotedMap((prev) => ({ ...prev, [itemId]: choice }));
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, choice, sessionId }),
      });
    },
    [sessionId]
  );

  const pendingItems = items.filter((item) => !(item.id in votedMap));
  const votedCount = Object.keys(votedMap).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-paw">🐾</span>
          <span className="logo-text">PawSwipe</span>
        </div>
        <nav className="tabs">
          <button
            className={`tab${view === 'swipe' ? ' active' : ''}`}
            onClick={() => setView('swipe')}
          >
            Swipe
          </button>
          <button
            className={`tab${view === 'results' ? ' active' : ''}`}
            onClick={() => setView('results')}
          >
            Results
          </button>
        </nav>
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
            onViewResults={() => setView('results')}
          />
        ) : (
          <ResultsView results={results} onRefresh={fetchResults} />
        )}
      </main>
    </div>
  );
}
