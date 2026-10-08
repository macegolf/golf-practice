import { useStore } from '../data/store';
import type { Shot } from '../data/types';
import { pct } from '../lib/format';
import { tally } from '../lib/stats';

/** `hidden` result ids are left out; the rest keep their share of all shots. */
export function StackedBar({ shots, hidden }: { shots: Shot[]; hidden?: Set<string> }) {
  const { state } = useStore();
  const { rows, total } = tally(state, shots);
  return (
    <div className="stacked" role="img" aria-label="Result distribution">
      {total === 0 ? (
        <span className="stacked-empty" />
      ) : (
        rows
          .filter((r) => r.count > 0 && !hidden?.has(r.result.id))
          .map((r) => (
            <span
              key={r.result.id}
              style={{ width: `${r.share * 100}%`, background: r.result.color }}
              title={`${r.result.name}: ${r.count}`}
            />
          ))
      )}
    </div>
  );
}

/** Table of count and share per result, with an inline bar per row. */
export function ResultBreakdown({ shots, hidden }: { shots: Shot[]; hidden?: Set<string> }) {
  const { state } = useStore();
  const { rows, total } = tally(state, shots);
  const shown = rows.filter((r) => !hidden?.has(r.result.id));
  const shownCount = shown.reduce((n, r) => n + r.count, 0);
  const filtered = shown.length < rows.length;
  return (
    <table className="breakdown">
      <thead>
        <tr>
          <th>Result</th>
          <th className="num">Shots</th>
          <th className="num">%</th>
          <th className="bar-col" aria-hidden />
        </tr>
      </thead>
      <tbody>
        {shown.map((r) => (
          <tr key={r.result.id}>
            <td>
              <span className="swatch" style={{ background: r.result.color }} />
              {r.result.name}
            </td>
            <td className="num">{r.count}</td>
            <td className="num">{pct(r.share)}</td>
            <td className="bar-col">
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${r.share * 100}%`, background: r.result.color }} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>{filtered ? 'Shown' : 'Total'}</td>
          <td className="num">{shownCount}</td>
          <td className="num">{total ? pct(shownCount / total) : '–'}</td>
          <td className="muted small">{filtered ? `of ${total} shots` : ''}</td>
        </tr>
      </tfoot>
    </table>
  );
}
