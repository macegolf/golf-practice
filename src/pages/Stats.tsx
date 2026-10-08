import { useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { PageHeader } from '../components/Layout';
import { ResultBreakdown, StackedBar } from '../components/ResultBreakdown';
import { clubName, swingLabel } from '../data/selectors';
import { useStore } from '../data/store';
import { localDateInput } from '../lib/format';

const ALL = '';

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return localDateInput(d);
}

export default function Stats() {
  const { state } = useStore();
  const [clubId, setClubId] = useState(ALL);
  const [shotTypeId, setShotTypeId] = useState(ALL);
  const [swingId, setSwingId] = useState(ALL);
  const [from, setFrom] = useState(() => monthsAgo(3));
  const [to, setTo] = useState(() => localDateInput());
  // Hidden rather than shown, so a newly added result type starts visible.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const shotTypeOfSwing = new Map(state.swingTypes.map((w) => [w.id, w.shotTypeId]));

  // Session date range applies to everything below, including the filter options.
  const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
  const sessionDay = new Map(state.sessions.map((s) => [s.id, localDateInput(new Date(s.startedAt))]));
  const inRange = state.shots.filter((s) => {
    const day = sessionDay.get(s.sessionId);
    return !!day && (!lo || day >= lo) && (!hi || day <= hi);
  });

  // Only offer options that actually have shots, including archived ones.
  const clubIds = new Set(inRange.map((s) => s.clubId));
  const clubOptions = state.clubs
    .filter((c) => clubIds.has(c.id))
    .sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.sortOrder - b.sortOrder);
  const effectiveClub = clubIds.has(clubId) ? clubId : ALL;

  const byClub = effectiveClub ? inRange.filter((s) => s.clubId === effectiveClub) : inRange;
  const typeIds = new Set(byClub.map((s) => shotTypeOfSwing.get(s.swingTypeId)));
  const typeOptions = state.shotTypes.filter((t) => typeIds.has(t.id)).sort((a, b) => a.sortOrder - b.sortOrder);
  const effectiveType = typeIds.has(shotTypeId) ? shotTypeId : ALL;

  const byType = effectiveType ? byClub.filter((s) => shotTypeOfSwing.get(s.swingTypeId) === effectiveType) : byClub;
  const swingIds = new Set(byType.map((s) => s.swingTypeId));
  const typeOrder = new Map(state.shotTypes.map((t) => [t.id, t.sortOrder]));
  const swingOptions = state.swingTypes
    .filter((w) => swingIds.has(w.id))
    .sort((a, b) => (typeOrder.get(a.shotTypeId) ?? 0) - (typeOrder.get(b.shotTypeId) ?? 0) || a.sortOrder - b.sortOrder);
  const effectiveSwing = swingIds.has(swingId) ? swingId : ALL;

  const shots = effectiveSwing ? byType.filter((s) => s.swingTypeId === effectiveSwing) : byType;
  const sessionCount = new Set(shots.map((s) => s.sessionId)).size;

  const resultOptions = [...state.resultTypes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => !r.archived || inRange.some((s) => s.resultId === r.id));
  const toggleResult = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const heading = [
    effectiveClub ? clubName(state, effectiveClub) : 'All clubs',
    effectiveSwing
      ? swingLabel(state, effectiveSwing)
      : effectiveType
        ? state.shotTypes.find((t) => t.id === effectiveType)?.name
        : 'All shot types',
  ].join(' · ');

  return (
    <>
      <PageHeader title="Stats" />
      {state.shots.length === 0 ? (
        <div className="card empty">
          <p>No shots recorded yet. Stats will build up as you practise.</p>
        </div>
      ) : (
        <>
          <section className="card section filters">
            <label className="field">
              <span>From</span>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="field filter-wide">
              <span>Club</span>
              <select value={effectiveClub} onChange={(e) => setClubId(e.target.value)}>
                <option value={ALL}>All clubs</option>
                {clubOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.archived ? ' (removed)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Shot type</span>
              <select value={effectiveType} onChange={(e) => setShotTypeId(e.target.value)}>
                <option value={ALL}>All shot types</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Swing</span>
              <select value={effectiveSwing} onChange={(e) => setSwingId(e.target.value)}>
                <option value={ALL}>All swings</option>
                {swingOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {/* Without a shot type chosen, name the shot type too, e.g. "Pitch · 1/2". */}
                    {effectiveType ? w.name : swingLabel(state, w.id)}
                  </option>
                ))}
              </select>
            </label>
            <div className="field filter-wide">
              <span>Results</span>
              <div className="result-filter">
                {resultOptions.map((r) => {
                  const on = !hidden.has(r.id);
                  return (
                    <button key={r.id} type="button" className={`chip result-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleResult(r.id)}>
                      <span className="swatch" style={{ background: r.color }} />
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="section">
            <h2>{heading}</h2>
            <p className="muted small">
              {shots.length} shots across {sessionCount} session{sessionCount === 1 ? '' : 's'}
            </p>
            <div className="card">
              <StackedBar shots={shots} hidden={hidden} />
              <ResultBreakdown shots={shots} hidden={hidden} />
            </div>
          </section>

          <Dashboard shots={shots} hidden={hidden} />
        </>
      )}
    </>
  );
}
