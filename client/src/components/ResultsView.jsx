import { useState } from 'react';

const SORTS = [
  { value: 'most_loved',    label: '❤️  Most Loved'    },
  { value: 'most_divisive', label: '⚡ Most Divisive'  },
  { value: 'most_voted',    label: '📊 Most Voted'     },
  { value: 'least_voted',   label: '🔕 Least Voted'    },
];

function yesRate(item) {
  return item.total_votes > 0 ? item.yes_count / item.total_votes : 0;
}

function sortItems(items, sortBy) {
  const copy = [...items];
  switch (sortBy) {
    case 'most_loved':
      return copy.sort((a, b) => yesRate(b) - yesRate(a));
    case 'most_divisive':
      return copy.sort(
        (a, b) =>
          Math.abs(yesRate(a) - 0.5) - Math.abs(yesRate(b) - 0.5)
      );
    case 'most_voted':
      return copy.sort((a, b) => b.total_votes - a.total_votes);
    case 'least_voted':
      return copy.sort((a, b) => a.total_votes - b.total_votes);
    default:
      return copy;
  }
}

export default function ResultsView({ results, onRefresh }) {
  const [sortBy, setSortBy] = useState('most_loved');
  const [imgFailed, setImgFailed] = useState({});
  const sorted = sortItems(results, sortBy);
  const totalVotes = results.reduce((s, r) => s + r.total_votes, 0);

  return (
    <div className="results-view">
      <div className="results-header">
        <div>
          <h2 className="results-title">Community Results</h2>
          <p className="results-meta">{totalVotes.toLocaleString()} votes cast</p>
        </div>
        <div className="results-controls">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn-icon" onClick={onRefresh} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      <ol className="results-list">
        {sorted.map((item, idx) => {
          const rate = Math.round(yesRate(item) * 100);
          const src = imgFailed[item.id]
            ? `https://placedog.net/56/56?id=${item.id}`
            : item.image_url;
          return (
            <li key={item.id} className="result-item">
              <span className="result-rank">#{idx + 1}</span>
              <img
                src={src}
                alt={item.name}
                className="result-thumb"
                onError={() =>
                  setImgFailed((p) => ({ ...p, [item.id]: true }))
                }
              />
              <div className="result-info">
                <div className="result-name-row">
                  <span className="result-name">{item.name}</span>
                  <span className="result-pct">{rate}%</span>
                </div>
                <div className="vote-bar">
                  <div
                    className="vote-bar-fill"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <p className="vote-counts">
                  ♥ {item.yes_count.toLocaleString()} &nbsp;·&nbsp; ✗{' '}
                  {item.no_count.toLocaleString()} &nbsp;·&nbsp;{' '}
                  {item.total_votes.toLocaleString()} votes
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
