import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { startSession } from '../data/actions';
import { activeSession, bagClubs } from '../data/selectors';
import { useStore } from '../data/store';
import { localDateInput } from '../lib/format';
import { uid } from '../lib/uid';

export default function NewSession() {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(localDateInput());
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (activeSession(state)) return <Navigate to="/session" replace />;

  const clubs = bagClubs(state);
  const knownLocations = [...new Set(state.sessions.map((s) => s.location).filter(Boolean))];

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = () => {
    if (picked.size === 0) return;
    const today = localDateInput();
    // Today uses the current time; a back-dated session is placed at midday.
    const startedAt = date === today ? new Date() : new Date(`${date}T12:00:00`);
    update((s) =>
      startSession(s, {
        id: uid(),
        startedAt: startedAt.toISOString(),
        endedAt: null,
        location: location.trim(),
        note: note.trim(),
        // Keep bag order so the session's club strip matches My Bag.
        clubIds: clubs.filter((c) => picked.has(c.id)).map((c) => c.id),
      }),
    );
    navigate('/session', { replace: true });
  };

  return (
    <>
      <PageHeader title="New session" back="/" />
      <section className="section card">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={localDateInput()} onChange={(e) => setDate(e.target.value || localDateInput())} />
        </label>
        <label className="field">
          <span>Location (optional)</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} list="locations" placeholder="e.g. Local driving range" />
          <datalist id="locations">
            {knownLocations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Working on ball position" />
        </label>
      </section>

      <section className="section card">
        <h2>What clubs do you want to use in this session?</h2>
        {clubs.length === 0 ? (
          <p className="muted small">
            Your bag is empty. <Link to="/bag">Set up My Bag</Link> first.
          </p>
        ) : (
          <>
            <div className="pick-actions">
              <button className="btn btn-small" onClick={() => setPicked(new Set(clubs.map((c) => c.id)))}>
                Select all
              </button>
              <button className="btn btn-small" disabled={picked.size === 0} onClick={() => setPicked(new Set())}>
                Clear
              </button>
            </div>
            <div className="chip-grid">
              {clubs.map((c) => {
                const on = picked.has(c.id);
                return (
                  <button key={c.id} className={`chip chip-toggle${on ? ' chip-on' : ''}`} aria-pressed={on} onClick={() => toggle(c.id)}>
                    {on ? '✓ ' : ''}
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="muted small pick-hint">
              {picked.size === 0
                ? 'Pick at least one club.'
                : `${picked.size} club${picked.size === 1 ? '' : 's'} selected. You can add more during the session.`}
            </p>
          </>
        )}
      </section>

      <div className="pad">
        <button className="btn btn-primary btn-big btn-block" disabled={picked.size === 0} onClick={start}>
          Start session
        </button>
      </div>
    </>
  );
}
