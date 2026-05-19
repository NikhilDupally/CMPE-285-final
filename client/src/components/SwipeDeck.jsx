import { useEffect, useRef, useState } from 'react';
import SwipeCard from './SwipeCard.jsx';

export default function SwipeDeck({
  items,
  total,
  votedCount,
  onVote,
  onViewResults,
  onUndo,
  canUndo,
}) {
  // Track when the current top card was shown (for button-click timing)
  const cardShownAtRef = useRef(Date.now());
  const topId = items[0]?.id;

  useEffect(() => {
    cardShownAtRef.current = Date.now();
  }, [topId]);

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
  const pct = total > 0 ? (votedCount / total) * 100 : 0;

  function btnVote(choice) {
    const elapsed = Date.now() - cardShownAtRef.current;
    onVote(items[0].id, choice, elapsed);
  }

  function handleCardVote(item, choice, decisionTimeMs) {
    onVote(item.id, choice, decisionTimeMs);
  }

  return (
    <div className="swipe-deck">
      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">{votedCount} / {total}</span>
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
              onVote={handleCardVote}
            />
          );
        })}
      </div>

      <div className="hint-row">
        <span className="hint hint--no">← Pass</span>
        <span className="hint hint--yes">Adopt →</span>
      </div>

      <div className="action-row">
        <button className="btn btn--no"  aria-label="Pass"  onClick={() => btnVote('no')}>✗</button>
        <button
          className={`btn btn--undo${canUndo ? '' : ' btn--undo-disabled'}`}
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last swipe"
        >
          ↩
        </button>
        <button className="btn btn--yes" aria-label="Adopt" onClick={() => btnVote('yes')}>♥</button>
      </div>
    </div>
  );
}
