import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { PageHeader } from '../components/Layout';
import { removeClub, updateClub } from '../data/actions';
import { activeShotTypes, swingsOf } from '../data/selectors';
import { useStore } from '../data/store';
import { CATEGORIES, type ClubCategory, type ClubSwing } from '../data/types';

function parseMetres(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function ClubEdit() {
  const { id } = useParams();
  const { state, update } = useStore();
  const navigate = useNavigate();
  const dialog = useDialog();
  const club = state.clubs.find((c) => c.id === id);

  if (!club) return <PageHeader title="Club not found" back="/bag" />;

  const setSwings = (swings: ClubSwing[]) => update((s) => updateClub(s, club.id, { swings }));
  const rowFor = (swingId: string) => club.swings.find((w) => w.swingTypeId === swingId);

  const toggleSwing = (swingId: string) => {
    if (rowFor(swingId)) setSwings(club.swings.filter((w) => w.swingTypeId !== swingId));
    else setSwings([...club.swings, { swingTypeId: swingId, carry: null, total: null }]);
  };

  /** Turning a shot type on enables all its swings; off removes them all. */
  const toggleShotType = (swingIds: string[], on: boolean) => {
    const rest = club.swings.filter((w) => !swingIds.includes(w.swingTypeId));
    setSwings(on ? [...rest, ...swingIds.map((sid) => ({ swingTypeId: sid, carry: null, total: null }))] : rest);
  };

  const setDistance = (swingId: string, field: 'carry' | 'total', value: string) =>
    setSwings(club.swings.map((w) => (w.swingTypeId === swingId ? { ...w, [field]: parseMetres(value) } : w)));

  const remove = async () => {
    const hasShots = state.shots.some((sh) => sh.clubId === club.id);
    const msg = hasShots
      ? `Remove ${club.name} from your bag? Its practice history will be kept.`
      : `Remove ${club.name} from your bag?`;
    if (!(await dialog.confirm(msg, { confirmLabel: 'Remove', danger: true }))) return;
    update((s) => removeClub(s, club.id));
    navigate('/bag');
  };

  const distanceInputs = (row: ClubSwing) => (
    <div className="dist-inputs">
      <label>
        <span>Carry (m)</span>
        <input type="number" inputMode="numeric" min={0} value={row.carry ?? ''} onChange={(e) => setDistance(row.swingTypeId, 'carry', e.target.value)} placeholder="m" />
      </label>
      <label>
        <span>Total (m)</span>
        <input type="number" inputMode="numeric" min={0} value={row.total ?? ''} onChange={(e) => setDistance(row.swingTypeId, 'total', e.target.value)} placeholder="m" />
      </label>
    </div>
  );

  return (
    <>
      <PageHeader title={club.name} back="/bag" />
      <section className="section card">
        <label className="field">
          <span>Name</span>
          <input value={club.name} onChange={(e) => update((s) => updateClub(s, club.id, { name: e.target.value }))} />
        </label>
        <label className="field">
          <span>Type</span>
          <select value={club.category} onChange={(e) => update((s) => updateClub(s, club.id, { category: e.target.value as ClubCategory }))}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="section">
        <h2>Shot types &amp; distances</h2>
        <p className="muted small">
          Turn on the shots you play with this club. Shot types and swings are managed in <Link to="/settings">Settings</Link>.
        </p>
        <div className="card swing-edit">
          {activeShotTypes(state).map((t) => {
            const swings = swingsOf(state, t.id);
            const enabled = swings.filter((w) => rowFor(w.id));
            const on = enabled.length > 0;
            const single = swings.length === 1;
            return (
              <div key={t.id} className={`swing-edit-row${on ? '' : ' off'}`}>
                <label className="toggle">
                  <input type="checkbox" checked={on} onChange={() => toggleShotType(swings.map((w) => w.id), !on)} />
                  <span>{t.name}</span>
                </label>
                {on && single && t.tracksDistance && distanceInputs(rowFor(swings[0].id)!)}
                {on && !single && (
                  <div className="sub-swings">
                    {swings.map((w) => {
                      const row = rowFor(w.id);
                      return (
                        <div key={w.id} className={`sub-swing${row ? '' : ' off'}`}>
                          <label className="toggle toggle-sub">
                            <input type="checkbox" checked={!!row} onChange={() => toggleSwing(w.id)} />
                            <span>{w.name}</span>
                          </label>
                          {row && t.tracksDistance && distanceInputs(row)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="pad stack">
        <button className="btn btn-primary btn-block" onClick={() => navigate('/bag')}>
          Done
        </button>
        <button className="btn btn-danger btn-block" onClick={remove}>
          Remove from bag
        </button>
      </div>
    </>
  );
}
