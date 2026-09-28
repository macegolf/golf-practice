import { Link } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { addClub, moveClub } from '../data/actions';
import { CLUB_PRESETS, STANDARD_SET } from '../data/defaults';
import { bagClubs, clubSwings } from '../data/selectors';
import { useStore } from '../data/store';
import { metres } from '../lib/format';
import { uid } from '../lib/uid';

export default function Bag() {
  const { state, update } = useStore();
  const clubs = bagClubs(state);

  const addStandardSet = () =>
    update((s) =>
      STANDARD_SET.reduce((acc, name) => {
        const preset = CLUB_PRESETS.find((p) => p.name === name)!;
        return addClub(acc, uid(), preset.name, preset.category);
      }, s),
    );

  return (
    <>
      <PageHeader
        title="My Bag"
        action={
          <Link className="btn btn-small" to="/bag/add">
            + Add club
          </Link>
        }
      />
      {clubs.length === 0 ? (
        <div className="card empty">
          <p>Your bag is empty. Start with a standard set, then edit it to match your clubs.</p>
          <p className="muted small">Driver, 3 Wood, 4 Hybrid, 5–9 Iron, PW, 52°, 56°, 60°, Putter</p>
          <button className="btn btn-primary" onClick={addStandardSet}>
            Add standard set
          </button>
          <Link className="btn" to="/bag/add">
            Pick clubs individually
          </Link>
        </div>
      ) : (
        <ul className="club-list">
          {clubs.map((club, i) => {
            const swings = clubSwings(state, club);
            return (
              <li key={club.id} className="card club-row">
                <Link to={`/bag/${club.id}`} className="club-main">
                  <div className="club-name">{club.name}</div>
                  {swings.length === 0 ? (
                    <div className="muted small">No shot types — tap to add</div>
                  ) : (
                    <table className="dist-table">
                      <thead>
                        <tr>
                          <th />
                          <th className="num">Carry</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {swings.map((w) => (
                          <tr key={w.swingTypeId}>
                            <td>{w.label}</td>
                            <td className="num">{w.shotType.tracksDistance ? metres(w.carry) : ''}</td>
                            <td className="num">{w.shotType.tracksDistance ? metres(w.total) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Link>
                <div className="reorder">
                  <button className="icon-btn" disabled={i === 0} onClick={() => update((s) => moveClub(s, club.id, -1))} aria-label={`Move ${club.name} up`}>
                    ▲
                  </button>
                  <button className="icon-btn" disabled={i === clubs.length - 1} onClick={() => update((s) => moveClub(s, club.id, 1))} aria-label={`Move ${club.name} down`}>
                    ▼
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
