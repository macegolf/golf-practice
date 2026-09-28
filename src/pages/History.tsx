import { Link } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { StackedBar } from '../components/ResultBreakdown';
import { clubName, sessionShots, sessionsNewestFirst, swingLabel } from '../data/selectors';
import { useStore } from '../data/store';
import { formatDate, formatTime } from '../lib/format';
import { groupByClubSwing } from '../lib/stats';

export default function History() {
  const { state } = useStore();
  const sessions = sessionsNewestFirst(state);

  return (
    <>
      <PageHeader title="History" />
      {sessions.length === 0 ? (
        <div className="card empty">
          <p>No sessions yet. Your completed sessions will appear here.</p>
        </div>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const shots = sessionShots(state, s.id);
            const groups = groupByClubSwing(shots);
            return (
              <li key={s.id}>
                <Link to={`/sessions/${s.id}`} className="card session-card">
                  <div className="session-card-top">
                    <strong>{formatDate(s.startedAt)}</strong>
                    <span className="muted">{shots.length} shots</span>
                  </div>
                  <div className="muted small">
                    {formatTime(s.startedAt)}
                    {s.location && ` · ${s.location}`}
                    {!s.endedAt && ' · in progress'}
                  </div>
                  {groups.length > 0 && (
                    <div className="small">
                      {groups
                        .map((g) => `${clubName(state, g.clubId)} ${swingLabel(state, g.swingTypeId)}`)
                        .join(', ')}
                    </div>
                  )}
                  <StackedBar shots={shots} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
