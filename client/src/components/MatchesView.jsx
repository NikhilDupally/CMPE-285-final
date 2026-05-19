import { useState } from 'react';

const DEFAULT_THRESHOLD = 50;

function yesRate(item) {
  return item.total_votes > 0 ? (item.yes_count / item.total_votes) * 100 : 0;
}

export default function MatchesView({ items, votedMap, results, isLive }) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [imgFailed, setImgFailed] = useState({});

  // Build a lookup of result data by item id
  const resultById = {};
  for (const r of results) resultById[r.id] = r;

  const userYesIds = new Set(
    Object.entries(votedMap)
      .filter(([, v]) => v === 'yes')
      .map(([k]) => k)
  );

  const matches = items
    .filter((item) => {
      if (!userYesIds.has(item.id)) return false;
      const r = resultById[item.id];
      return r && yesRate(r) >= threshold;
    })
    .map((item) => ({ ...item, ...(resultById[item.id] ?? {}) }))
    .sort((a, b) => yesRate(b) - yesRate(a));

  const totalYes = userYesIds.size;

  return (
    <div className="results-view">
      <div className="results-header">
        <div>
          <h2 className="results-title">
            Your Matches 🐾
            {isLive && <span className="live-badge">Live</span>}
          </h2>
          <p className="results-meta">
            You liked {totalYes} breed{totalYes !== 1 ? 's' : ''}
            {matches.length > 0 && ` — ${matches.length} match${matches.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        <div className="threshold-wrap">
          <label className="threshold-label">
            ≥ {threshold}% yes
          </label>
          <input
            type="range"
            className="threshold-slider"
            min={10}
            max={90}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
      </div>

      {totalYes === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🐕</div>
          <p>Start swiping to find your matches!</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤔</div>
          <p>No matches at this threshold yet.</p>
          <p className="empty-hint">Try lowering the slider.</p>
        </div>
      ) : (
        <ol className="results-list">
          {matches.map((item, idx) => {
            const rate = Math.round(yesRate(item));
            const src = imgFailed[item.id]
              ? `https://placedog.net/56/56?id=${item.id}`
              : item.image_url;
            return (
              <li key={item.id} className="result-item result-item--match">
                <span className="result-rank">#{idx + 1}</span>
                <img
                  src={src}
                  alt={item.name}
                  className="result-thumb"
                  onError={() => setImgFailed((p) => ({ ...p, [item.id]: true }))}
                />
                <div className="result-info">
                  <div className="result-name-row">
                    <span className="result-name">{item.name}</span>
                    <span className="match-badge">♥ Match</span>
                  </div>
                  <div className="vote-bar">
                    <div className="vote-bar-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <p className="vote-counts">
                    {rate}% of everyone also loves this breed
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
