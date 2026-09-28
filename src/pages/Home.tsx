import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { StackedBar } from '../components/ResultBreakdown';
import { activeSession, bagClubs, sessionShots, sessionsNewestFirst } from '../data/selectors';
import { useStore } from '../data/store';
import { formatDate, formatTime } from '../lib/format';

export default function Home() {
  const { state } = useStore();
  const navigate = useNavigate();
  const active = activeSession(state);
  const hasClubs = bagClubs(state).length > 0;
  const last = sessionsNewestFirst(state).find((s) => s.endedAt);

  return (
    <>
      <PageHeader title="Practice" />
      {!hasClubs ? (
        <div className="card empty">
          <p>Set up your bag first so you can pick clubs during a session.</p>
          <Link className="btn btn-primary" to="/bag">
            Set up My Bag
          </Link>
        </div>
      ) : active ? (
        <div className="card hero">
          <div className="eyebrow">Session in progress</div>
          <div className="hero-title">{formatDate(active.startedAt)}</div>
          <div className="muted">
            Started {formatTime(active.startedAt)} · {sessionShots(state, active.id).length} shots
            {active.location && ` · ${active.location}`}
          </div>
          <button className="btn btn-primary btn-big" onClick={() => navigate('/session')}>
            Resume session
          </button>
        </div>
      ) : (
        <div className="card hero">
          <div className="hero-title">Ready to practise?</div>
          <div className="muted">Pick a club and swing, then tap the result after each shot.</div>
          <button className="btn btn-primary btn-big" onClick={() => navigate('/session/new')}>
            Start session
          </button>
        </div>
      )}

      {last && (
        <section className="section">
          <h2>Last session</h2>
          <Link to={`/sessions/${last.id}`} className="card session-card">
            <div className="session-card-top">
              <strong>{formatDate(last.startedAt)}</strong>
              <span className="muted">{sessionShots(state, last.id).length} shots</span>
            </div>
            {last.location && <div className="muted small">{last.location}</div>}
            <StackedBar shots={sessionShots(state, last.id)} />
          </Link>
        </section>
      )}
    </>
  );
}
