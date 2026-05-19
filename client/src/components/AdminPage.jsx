import { useState } from 'react';

const DEFAULT_KEY = '';

export default function AdminPage() {
  const [adminKey, setAdminKey]   = useState(DEFAULT_KEY);
  const [form, setForm]           = useState({ name: '', breed_key: '', image_url: '', description: '', fun_fact: '' });
  const [status, setStatus]       = useState(null); // { type: 'ok'|'err', msg: string }
  const [loading, setLoading]     = useState(false);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'err', msg: data.error || 'Unknown error' });
      } else {
        setStatus({ type: 'ok', msg: `"${form.name}" added with id "${data.id}"` });
        setForm({ name: '', breed_key: '', image_url: '', description: '', fun_fact: '' });
      }
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <h2 className="admin-title">Admin Panel</h2>
      <p className="admin-sub">
        Add a new breed without touching the code. Default key: <code>pawswipe</code>
        (set <code>ADMIN_KEY</code> env var to change).
      </p>

      <form className="admin-form" onSubmit={submit}>
        <label className="admin-label">
          Admin Key *
          <input
            className="admin-input"
            type="password"
            required
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="pawswipe"
          />
        </label>

        <label className="admin-label">
          Breed Name *
          <input
            className="admin-input"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Labrador Retriever"
          />
        </label>

        <label className="admin-label">
          Image URL * <span className="admin-hint">(https://…)</span>
          <input
            className="admin-input"
            required
            type="url"
            value={form.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            placeholder="https://images.dog.ceo/breeds/…"
          />
        </label>

        <label className="admin-label">
          Description
          <input
            className="admin-input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="One-sentence description"
          />
        </label>

        <label className="admin-label">
          Fun Fact
          <input
            className="admin-input"
            value={form.fun_fact}
            onChange={(e) => set('fun_fact', e.target.value)}
            placeholder="An interesting fact"
          />
        </label>

        <label className="admin-label">
          Breed Key <span className="admin-hint">(optional — auto-derived from name)</span>
          <input
            className="admin-input"
            value={form.breed_key}
            onChange={(e) => set('breed_key', e.target.value)}
            placeholder="e.g. retriever/labrador"
          />
        </label>

        <button className="btn btn--primary admin-submit" type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add Breed'}
        </button>
      </form>

      {status && (
        <div className={`admin-status admin-status--${status.type}`}>
          {status.type === 'ok' ? '✓ ' : '✗ '}{status.msg}
        </div>
      )}

      <p className="admin-curl">
        Or use curl:
        <br />
        <code>{`curl -X POST http://localhost:3001/api/admin/items \\`}</code>
        <br />
        <code>{`  -H "X-Admin-Key: pawswipe" \\`}</code>
        <br />
        <code>{`  -H "Content-Type: application/json" \\`}</code>
        <br />
        <code>{`  -d '{"name":"My Dog","image_url":"https://…"}'`}</code>
      </p>
    </div>
  );
}
