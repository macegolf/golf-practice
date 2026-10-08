import { useEffect, useRef, useState } from 'react';
import { swingsOf } from '../data/selectors';
import { useStore } from '../data/store';
import type { AppState, Club, ResultType, Shot, ShotType, SwingType } from '../data/types';
import { localDateInput, pct } from '../lib/format';

// Stats → Dashboard: shot type → swing → one chart per club, with one 100%-stacked
// bar per practice day (same-day sessions combined).

interface Day {
  key: string; // yyyy-mm-dd, local
  total: number;
  counts: Map<string, number>; // result id → shots
}

interface ClubChart {
  club: Club;
  total: number;
  days: Day[];
}

interface SwingGroup {
  swing: SwingType;
  clubs: ClubChart[];
}

interface TypeGroup {
  shotType: ShotType;
  /** Show swing headings only when the shot type has a choice of swings. */
  showSwings: boolean;
  swings: SwingGroup[];
}

function buildGroups(state: AppState, shots: Shot[], dayOf: (sh: Shot) => string): TypeGroup[] {
  const swingById = new Map(state.swingTypes.map((w) => [w.id, w]));
  const clubById = new Map(state.clubs.map((c) => [c.id, c]));
  // swing id → club id → shots
  const bySwing = new Map<string, Map<string, Shot[]>>();
  for (const sh of shots) {
    let byClub = bySwing.get(sh.swingTypeId);
    if (!byClub) bySwing.set(sh.swingTypeId, (byClub = new Map()));
    const list = byClub.get(sh.clubId);
    if (list) list.push(sh);
    else byClub.set(sh.clubId, [sh]);
  }

  const clubOrder = (c: Club) => (c.archived ? 1e9 : 0) + c.sortOrder;
  const types = [...state.shotTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups: TypeGroup[] = [];
  for (const shotType of types) {
    const swings = state.swingTypes
      .filter((w) => w.shotTypeId === shotType.id && bySwing.has(w.id))
      .sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.sortOrder - b.sortOrder);
    if (swings.length === 0) continue;
    groups.push({
      shotType,
      showSwings: swingsOf(state, shotType.id).length > 1 || swings.length > 1 || !!swings[0].archived,
      swings: swings.map((swing) => {
        const byClub = bySwing.get(swing.id)!;
        const clubs = [...byClub.keys()]
          .map((id) => clubById.get(id))
          .filter((c): c is Club => !!c)
          .sort((a, b) => clubOrder(a) - clubOrder(b))
          .map((club) => {
            const days = new Map<string, Day>();
            for (const sh of byClub.get(club.id)!) {
              const key = dayOf(sh);
              let d = days.get(key);
              if (!d) days.set(key, (d = { key, total: 0, counts: new Map() }));
              d.total++;
              d.counts.set(sh.resultId, (d.counts.get(sh.resultId) ?? 0) + 1);
            }
            const sorted = [...days.values()].sort((a, b) => a.key.localeCompare(b.key));
            return { club, total: byClub.get(club.id)!.length, days: sorted };
          });
        return { swing: swingById.get(swing.id)!, clubs };
      }),
    });
  }
  return groups;
}

function dayLabel(key: string, withYear: boolean): string {
  const d = new Date(`${key}T12:00:00`);
  return d.toLocaleDateString('en-AU', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

export function Dashboard({ shots, hidden }: { shots: Shot[]; hidden: Set<string> }) {
  const { state } = useStore();
  const sessionDay = new Map(state.sessions.map((s) => [s.id, localDateInput(new Date(s.startedAt))]));
  const dayOf = (sh: Shot) => sessionDay.get(sh.sessionId) ?? localDateInput(new Date(sh.createdAt));
  const groups = buildGroups(state, shots, dayOf);
  const results = [...state.resultTypes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => !hidden.has(r.id) && (!r.archived || shots.some((s) => s.resultId === r.id)));
  const years = new Set(shots.map((s) => dayOf(s).slice(0, 4)));
  const withYear = years.size > 1 || (years.size === 1 && !years.has(String(new Date().getFullYear())));

  return (
    <section className="section dashboard">
      <h2>Dashboard</h2>
      {groups.length === 0 ? (
        <div className="card muted">No shots match these filters.</div>
      ) : (
        <>
          <p className="muted small">Each bar is one practice day, showing that day's results as a share of its shots. The number under each date is how many shots were hit that day. Tap a bar for the details.</p>
          <ul className="legend" aria-label="Results">
            {results.map((r) => (
              <li key={r.id}>
                <span className="swatch" style={{ background: r.color }} />
                {r.name}
              </li>
            ))}
          </ul>
          {groups.map((g) => (
            <div key={g.shotType.id} className="dash-type">
              <h3>{g.shotType.name}</h3>
              {g.swings.map((sg) => (
                <div key={sg.swing.id} className="dash-swing">
                  {g.showSwings && <h4>{sg.swing.name}</h4>}
                  <div className="dash-charts">
                    {sg.clubs.map((c) => (
                      <TrendChart key={c.club.id} chart={c} results={results} withYear={withYear} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function TrendChart({ chart, results, withYear }: { chart: ClubChart; results: ResultType[]; withYear: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const day = chart.days.find((d) => d.key === selected);

  // Open on the most recent dates.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [chart.days.length]);

  const describe = (d: Day) =>
    `${dayLabel(d.key, true)}: ${d.total} shots. ` +
    results.map((r) => `${r.name} ${pct((d.counts.get(r.id) ?? 0) / d.total)}`).join(', ');

  return (
    <div className="card trend">
      <div className="trend-head">
        <strong>
          {chart.club.name}
          {chart.club.archived ? ' (removed)' : ''}
        </strong>
        <span className="muted small">Total: {chart.total} shots</span>
      </div>
      <div className="trend-plot">
        <div className="trend-axis" aria-hidden>
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="trend-scroll" ref={scroller}>
          <div className="trend-bars">
            {chart.days.map((d) => {
              const shown = results.map((r) => ({ r, n: d.counts.get(r.id) ?? 0 })).filter((x) => x.n > 0);
              const shownTotal = shown.reduce((n, x) => n + x.n, 0);
              return (
                <button
                  key={d.key}
                  type="button"
                  className={`trend-col${selected === d.key ? ' on' : ''}`}
                  aria-label={describe(d)}
                  aria-pressed={selected === d.key}
                  title={describe(d)}
                  onClick={() => setSelected((s) => (s === d.key ? null : d.key))}
                >
                  <span className="trend-stack">
                    {/* Hidden results leave empty space so the shown ones keep their true share. */}
                    {shownTotal < d.total && <span className="trend-gap" style={{ flexGrow: d.total - shownTotal }} />}
                    {[...shown].reverse().map(({ r, n }) => (
                      <span key={r.id} className="trend-seg" style={{ flexGrow: n, background: r.color }} />
                    ))}
                  </span>
                  <span className="trend-date">{dayLabel(d.key, withYear)}</span>
                  <span className="trend-n">{d.total}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {day && (
        <div className="trend-detail">
          <strong>
            {dayLabel(day.key, true)} · {day.total} shots
          </strong>
          <ul>
            {results.map((r) => {
              const n = day.counts.get(r.id) ?? 0;
              return (
                <li key={r.id}>
                  <span className="swatch" style={{ background: r.color }} />
                  {r.name} <span className="num">{pct(n / day.total)}</span> <span className="muted">({n})</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
