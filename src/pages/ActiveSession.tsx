import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../components/Dialog';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { StackedBar } from '../components/ResultBreakdown';
import { addShot, deleteSession, deleteShot, endSession, updateSession } from '../data/actions';
import {
  activeSession,
  bagClubs,
  clubName,
  clubSwings,
  groupByShotType,
  hasSwingChoice,
  sessionShots,
  swingLabel,
} from '../data/selectors';
import { useStore } from '../data/store';
import { formatDate, metres, pct } from '../lib/format';
import { tally } from '../lib/stats';
import { tapFeedback } from '../lib/feedback';
import { uid } from '../lib/uid';

export default function ActiveSession() {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const dialog = useDialog();
  const session = activeSession(state);
  const bag = bagClubs(state);
  // Only the clubs picked for this session; older sessions without a pick use the whole bag.
  const clubs = session?.clubIds ? bag.filter((c) => session.clubIds!.includes(c.id)) : bag;
  const otherClubs = bag.filter((c) => !clubs.includes(c));
  const [adding, setAdding] = useState(false);
  const shots = session ? sessionShots(state, session.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
  const lastShot = shots[shots.length - 1];

  // Resume on the last club + swing used, otherwise the first club in the bag.
  const [clubId, setClubId] = useState<string | undefined>(() =>
    lastShot && clubs.some((c) => c.id === lastShot.clubId) ? lastShot.clubId : clubs[0]?.id,
  );
  const club = clubs.find((c) => c.id === clubId) ?? clubs[0];
  const swings = club ? clubSwings(state, club) : [];
  const [swingTypeId, setSwingTypeId] = useState<string | undefined>(() =>
    lastShot && lastShot.clubId === clubId ? lastShot.swingTypeId : swings[0]?.swingTypeId,
  );
  const swing = swings.find((w) => w.swingTypeId === swingTypeId) ?? swings[0];
  const groups = groupByShotType(swings);
  const currentGroup = groups.find((g) => g.shotType.id === swing?.shotType.id);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const clubStrip = useRef<HTMLDivElement>(null);
  // Set while ending so the no-session redirect below doesn't beat navigation to the report.
  const ending = useRef(false);

  useEffect(() => {
    clubStrip.current?.querySelector('.chip-on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [club?.id]);

  if (!session) return ending.current ? null : <Navigate to="/" replace />;

  const selectClub = (id: string) => {
    const next = bag.find((c) => c.id === id);
    if (!next) return;
    const nextSwings = clubSwings(state, next);
    // Keep the same swing if the new club has it, else the same shot type, else its first shot.
    const keep =
      nextSwings.find((w) => w.swingTypeId === swing?.swingTypeId) ??
      nextSwings.find((w) => w.shotType.id === swing?.shotType.id) ??
      nextSwings[0];
    setClubId(id);
    setSwingTypeId(keep?.swingTypeId);
  };

  const addToSession = (id: string) => {
    update((s) => updateSession(s, session.id, { clubIds: [...clubs.map((c) => c.id), id] }));
    setAdding(false);
    selectClub(id);
  };

  const record = (resultId: string) => {
    if (!club || !swing) return;
    update((s) =>
      addShot(s, {
        id: uid(),
        sessionId: session.id,
        clubId: club.id,
        swingTypeId: swing.swingTypeId,
        resultId,
        createdAt: new Date().toISOString(),
      }),
    );
    setFlash((f) => ({ id: resultId, n: (f?.n ?? 0) + 1 }));
    tapFeedback();
  };

  const undo = () => lastShot && update((s) => deleteShot(s, lastShot.id));

  const finish = async () => {
    if (shots.length === 0) {
      if (!(await dialog.confirm('No shots recorded. Discard this session?', { confirmLabel: 'Discard', danger: true }))) return;
      update((s) => deleteSession(s, session.id));
      navigate('/', { replace: true });
      return;
    }
    if (!(await dialog.confirm('End this session?', { confirmLabel: 'End session' }))) return;
    ending.current = true;
    update((s) => endSession(s, session.id));
    navigate(`/sessions/${session.id}`, { replace: true });
  };

  const current = club && swing ? shots.filter((sh) => sh.clubId === club.id && sh.swingTypeId === swing.swingTypeId) : [];
  const { rows, total } = tally(state, current);
  const liveRows = rows.filter((r) => !r.result.archived);

  return (
    <div className="session">
      <header className="session-top">
        <button className="btn btn-small" onClick={() => navigate('/')}>
          ← Menu
        </button>
        <div className="session-top-title">
          <div>{formatDate(session.startedAt)}</div>
          <div className="muted small">{shots.length} shots this session</div>
        </div>
        <button className="btn btn-small btn-primary" onClick={finish}>
          End
        </button>
      </header>

      {clubs.length === 0 ? (
        <div className="card empty">
          <p>Your bag is empty.</p>
          <Link className="btn btn-primary" to="/bag">
            Set up My Bag
          </Link>
        </div>
      ) : (
        <>
          <div className="picker-label">Club</div>
          <div className="chip-strip" ref={clubStrip}>
            {clubs.map((c) => (
              <button key={c.id} className={`chip${c.id === club?.id ? ' chip-on' : ''}`} onClick={() => selectClub(c.id)}>
                {c.name}
              </button>
            ))}
            {otherClubs.length > 0 && (
              <button className={`chip chip-add${adding ? ' chip-add-open' : ''}`} onClick={() => setAdding((a) => !a)}>
                {adding ? 'Cancel' : '+ Add club'}
              </button>
            )}
          </div>
          {adding && (
            <div className="card add-clubs">
              <div className="muted small">Add a club to this session</div>
              <div className="chip-grid">
                {otherClubs.map((c) => (
                  <button key={c.id} className="chip" onClick={() => addToSession(c.id)}>
                    + {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="picker-label">Shot type</div>
          {groups.length === 0 ? (
            <div className="card muted small">
              {club?.name} has no shot types. <Link to={`/bag/${club?.id}`}>Add one in My Bag</Link>.
            </div>
          ) : (
            <div className="chip-strip">
              {groups.map((g) => (
                <button
                  key={g.shotType.id}
                  className={`chip${g.shotType.id === swing?.shotType.id ? ' chip-on' : ''}`}
                  onClick={() => g.shotType.id !== swing?.shotType.id && setSwingTypeId(g.rows[0].swingTypeId)}
                >
                  {g.shotType.name}
                </button>
              ))}
            </div>
          )}

          {currentGroup && hasSwingChoice(state, currentGroup.shotType.id) && (
            <>
              <div className="picker-label">Swing</div>
              <div className="chip-strip">
                {currentGroup.rows.map((w) => (
                  <button key={w.swingTypeId} className={`chip${w.swingTypeId === swing?.swingTypeId ? ' chip-on' : ''}`} onClick={() => setSwingTypeId(w.swingTypeId)}>
                    {w.swing.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {club && swing && (
            <div className="live card">
              <div className="live-head">
                <strong>
                  {club.name} · {swing.label}
                </strong>
                {swing.shotType.tracksDistance && (
                  <span className="muted small">
                    Carry {metres(swing.carry)} · Total {metres(swing.total)}
                  </span>
                )}
              </div>
              <StackedBar shots={current} />
              <div className="live-total">
                <span className="live-total-n">{total}</span> shots with this club &amp; shot
              </div>
            </div>
          )}

          <div className="result-grid">
            {liveRows.map((r) => (
              <button
                key={r.result.id}
                className="result-btn"
                style={{ ['--c' as string]: r.result.color }}
                disabled={!swing}
                onClick={() => record(r.result.id)}
              >
                {/* Keyed on tap count so the flash replays on every tap. */}
                {flash?.id === r.result.id && <span key={flash.n} className="flash-ring" aria-hidden />}
                <span className="result-name">{r.result.name}</span>
                <span className="result-count">{r.count}</span>
                <span className="result-pct">{total ? pct(r.share) : '–'}</span>
              </button>
            ))}
          </div>

          <button className="btn btn-block undo" disabled={!lastShot} onClick={undo}>
            {lastShot
              ? `Undo last: ${clubName(state, lastShot.clubId)} ${swingLabel(state, lastShot.swingTypeId)} – ${
                  state.resultTypes.find((r) => r.id === lastShot.resultId)?.name ?? ''
                }`
              : 'Undo last shot'}
          </button>
        </>
      )}
    </div>
  );
}
