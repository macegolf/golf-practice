import { useState } from 'react';
import { useDialog } from '../components/Dialog';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { ResultBreakdown, StackedBar } from '../components/ResultBreakdown';
import { deleteSession, deleteShot, updateSession, updateShot } from '../data/actions';
import { activeResults, clubName, sessionShots, swingLabel } from '../data/selectors';
import { useStore } from '../data/store';
import { formatDate, formatDuration, formatTime } from '../lib/format';
import { groupByClubSwing } from '../lib/stats';

export default function SessionReport() {
  const { id } = useParams();
  const { state, update } = useStore();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [editing, setEditing] = useState(false);
  const session = state.sessions.find((s) => s.id === id);

  if (!session) return <PageHeader title="Session not found" back="/history" />;

  const shots = sessionShots(state, session.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const groups = groupByClubSwing(shots);
  const isActive = state.activeSessionId === session.id;
  const results = activeResults(state);

  const remove = async () => {
    if (!(await dialog.confirm('Delete this session and all its shots? This cannot be undone.', { confirmLabel: 'Delete', danger: true }))) return;
    update((s) => deleteSession(s, session.id));
    navigate('/history', { replace: true });
  };

  return (
    <>
      <PageHeader title="Session report" back="/history" />
      <section className="card section">
        <div className="hero-title">{formatDate(session.startedAt)}</div>
        <div className="muted small">
          {formatTime(session.startedAt)}
          {session.endedAt ? ` – ${formatTime(session.endedAt)} · ${formatDuration(session.startedAt, session.endedAt)}` : ' · in progress'} ·{' '}
          {shots.length} shots
        </div>
        {editing ? (
          <>
            <label className="field">
              <span>Location</span>
              <input value={session.location} onChange={(e) => update((s) => updateSession(s, session.id, { location: e.target.value }))} />
            </label>
            <label className="field">
              <span>Note</span>
              <textarea rows={2} value={session.note} onChange={(e) => update((s) => updateSession(s, session.id, { note: e.target.value }))} />
            </label>
          </>
        ) : (
          <>
            {session.location && <div className="meta">📍 {session.location}</div>}
            {session.note && <div className="meta">📝 {session.note}</div>}
          </>
        )}
        {isActive && (
          <button className="btn btn-primary" onClick={() => navigate('/session')}>
            Resume session
          </button>
        )}
      </section>

      {groups.length > 1 && (
        <section className="section">
          <h2>Whole session</h2>
          <div className="card">
            <StackedBar shots={shots} />
            <ResultBreakdown shots={shots} />
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section key={`${g.clubId}|${g.swingTypeId}`} className="section">
          <h2>
            {clubName(state, g.clubId)} · {swingLabel(state, g.swingTypeId)}
          </h2>
          <div className="card">
            <StackedBar shots={g.shots} />
            <ResultBreakdown shots={g.shots} />
          </div>
        </section>
      ))}

      {shots.length === 0 && <div className="card empty">No shots recorded in this session.</div>}

      {editing && shots.length > 0 && (
        <section className="section">
          <h2>Shots</h2>
          <ul className="card shot-list">
            {shots.map((sh, i) => {
              const res = state.resultTypes.find((r) => r.id === sh.resultId);
              const options = res && res.archived ? [...results, res] : results;
              return (
                <li key={sh.id}>
                  <span className="shot-n">{i + 1}</span>
                  <span className="shot-desc">
                    {clubName(state, sh.clubId)} · {swingLabel(state, sh.swingTypeId)}
                  </span>
                  <select value={sh.resultId} onChange={(e) => update((s) => updateShot(s, sh.id, { resultId: e.target.value }))}>
                    {options.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn danger" aria-label={`Delete shot ${i + 1}`} onClick={() => update((s) => deleteShot(s, sh.id))}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="pad stack">
        <button className="btn btn-block" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done editing' : 'Edit session & shots'}
        </button>
        {editing && (
          <button className="btn btn-danger btn-block" onClick={remove}>
            Delete session
          </button>
        )}
      </div>
    </>
  );
}
