import { useState } from 'react';

export default function UsernameModal({ onSave }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    onSave(name.trim());
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-paw">🐾</div>
        <h2 className="modal-title">Welcome to PawSwipe!</h2>
        <p className="modal-sub">Swipe right to adopt, left to pass. What should we call you?</p>
        <form onSubmit={submit} className="modal-form">
          <input
            className="modal-input"
            type="text"
            placeholder="Your name…"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button className="btn btn--primary modal-btn" type="submit">
            Let's Go! →
          </button>
        </form>
        <button className="modal-skip" onClick={() => onSave('')}>
          Skip
        </button>
      </div>
    </div>
  );
}
