import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 110;   // px before a swipe commits
const MAX_ROTATE = 18;   // degrees at ±THRESHOLD

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export default function SwipeCard({ item, isTop, stackIndex, onVote }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(null); // 'left' | 'right' | null
  const [imgFailed, setImgFailed] = useState(false);
  const startRef = useRef(null);
  const cardRef = useRef(null);

  const progress = clamp(pos.x / THRESHOLD, -1, 1); // -1…0…+1
  const rotation = progress * MAX_ROTATE;
  const showAdopt = isTop && progress > 0.15;
  const showPass = isTop && progress < -0.15;

  const getXY = (e) =>
    e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

  const onStart = useCallback(
    (e) => {
      if (!isTop || flying) return;
      if (e.type === 'mousedown') e.preventDefault();
      startRef.current = getXY(e);
      setDragging(true);
    },
    [isTop, flying]
  );

  const onMove = useCallback(
    (e) => {
      if (!dragging || !startRef.current) return;
      if (e.cancelable) e.preventDefault();
      const { x, y } = getXY(e);
      setPos({ x: x - startRef.current.x, y: y - startRef.current.y });
    },
    [dragging]
  );

  const onEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(pos.x) >= THRESHOLD) {
      const dir = pos.x > 0 ? 'right' : 'left';
      setFlying(dir);
      setTimeout(() => onVote(item, dir === 'right' ? 'yes' : 'no'), 320);
    } else {
      setPos({ x: 0, y: 0 });
    }
    startRef.current = null;
  }, [dragging, pos.x, item, onVote]);

  // Attach document-level listeners so drag isn't lost when cursor leaves card
  useEffect(() => {
    if (!dragging) return;
    const opts = { passive: false };
    document.addEventListener('mousemove', onMove, opts);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, opts);
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove, opts);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove, opts);
      document.removeEventListener('touchend', onEnd);
    };
  }, [dragging, onMove, onEnd]);

  let transform;
  let transition;
  if (flying === 'right') {
    transform = 'translateX(160vw) rotate(30deg)';
    transition = 'transform 0.32s ease-in';
  } else if (flying === 'left') {
    transform = 'translateX(-160vw) rotate(-30deg)';
    transition = 'transform 0.32s ease-in';
  } else if (isTop) {
    transform = `translateX(${pos.x}px) translateY(${pos.y * 0.4}px) rotate(${rotation}deg)`;
    transition = dragging ? 'none' : 'transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275)';
  } else {
    const scale = 1 - stackIndex * 0.04;
    const ty = stackIndex * 12;
    transform = `scale(${scale}) translateY(${ty}px)`;
    transition = 'transform 0.3s ease';
  }

  const imgSrc = imgFailed
    ? `https://placedog.net/400/560?id=${item.id}`
    : item.image_url;

  return (
    <div
      ref={cardRef}
      className={`swipe-card${isTop ? ' swipe-card--top' : ''}`}
      style={{
        transform,
        transition,
        zIndex: flying ? 30 : isTop ? 20 : 20 - stackIndex,
        cursor: isTop ? (dragging ? 'grabbing' : 'grab') : 'default',
      }}
      onMouseDown={isTop ? onStart : undefined}
      onTouchStart={isTop ? onStart : undefined}
    >
      <div className="card-img-wrap">
        <img
          src={imgSrc}
          alt={item.name}
          className="card-img"
          draggable={false}
          onError={() => setImgFailed(true)}
        />

        {/* gradient overlay */}
        <div className="card-img-gradient" />

        {/* vote stamps */}
        {showAdopt && (
          <div
            className="stamp stamp--adopt"
            style={{ opacity: Math.min(Math.abs(progress) * 1.4, 1) }}
          >
            ADOPT ♥
          </div>
        )}
        {showPass && (
          <div
            className="stamp stamp--pass"
            style={{ opacity: Math.min(Math.abs(progress) * 1.4, 1) }}
          >
            PASS ✗
          </div>
        )}

        {/* swipe direction colour tint */}
        {isTop && pos.x !== 0 && (
          <div
            className={`card-tint${pos.x > 0 ? ' card-tint--yes' : ' card-tint--no'}`}
            style={{ opacity: Math.abs(progress) * 0.35 }}
          />
        )}

        <div className="card-name-overlay">
          <h2 className="card-name">{item.name}</h2>
        </div>
      </div>

      <div className="card-body">
        <p className="card-desc">{item.description}</p>
        {item.fun_fact && (
          <p className="card-fact">
            <span className="fact-icon">💡</span> {item.fun_fact}
          </p>
        )}
      </div>
    </div>
  );
}
