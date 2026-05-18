import SwipeCard from './SwipeCard.jsx';

export default function SwipeDeck({
  items,
  total,
  votedCount,
  onVote,
  onViewResults,
}) {
  if (total === 0) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading pups…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="end-screen">
        <div className="end-icon">🎉</div>
        <h2>You've reviewed all {total} pups!</h2>
        <p>See how your opinions compare to everyone else's</p>
        <button className="btn btn--primary" onClick={onViewResults}>
          View Results →
        </button>
      </div>
    );
  }

  const visible = items.slice(0, 3);

  function handleVote(item, choice) {
    onVote(item.id, choice);
  }

  const pct = total > 0 ? (votedCount / total) * 100 : 0;

  return (
    <div className="swipe-deck">
      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">
          {votedCount} / {total}
        </span>
      </div>

      <div className="card-stack">
        {[...visible].reverse().map((item, revIdx) => {
          const stackIndex = visible.length - 1 - revIdx;
          return (
            <SwipeCard
              key={item.id}
              item={item}
              isTop={stackIndex === 0}
              stackIndex={stackIndex}
              onVote={handleVote}
            />
          );
        })}
      </div>

      <div className="hint-row">
        <span className="hint hint--no">← Pass</span>
        <span className="hint hint--yes">Adopt →</span>
      </div>

      <div className="action-row">
        <button
          className="btn btn--no"
          aria-label="Pass"
          onClick={() => handleVote(items[0], 'no')}
        >
          ✗
        </button>
        <button
          className="btn btn--yes"
          aria-label="Adopt"
          onClick={() => handleVote(items[0], 'yes')}
        >
          ♥
        </button>
      </div>
    </div>
  );
}
