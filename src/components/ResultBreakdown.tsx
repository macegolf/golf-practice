import { useStore } from '../data/store';
import type { Shot } from '../data/types';
import { pct } from '../lib/format';
import { tally } from '../lib/stats';

export function StackedBar({ shots }: { shots: Shot[] }) {
  const { state } = useStore();
  const { rows, total } = tally(state, shots);
  return (
    <div className="stacked" role="img" aria-label="Result distribution">
      {total === 0 ? (
        <span className="stacked-empty" />
      ) : (
        rows
          .filter((r) => r.count > 0)
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
export function ResultBreakdown({ shots }: { shots: Shot[] }) {
  const { state } = useStore();
  const { rows, total } = tally(state, shots);
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
        {rows.map((r) => (
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
          <td>Total</td>
          <td className="num">{total}</td>
          <td className="num">{total ? '100%' : '–'}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
