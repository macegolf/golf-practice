import { useState } from 'react';
import { useDialog } from './Dialog';
import {
  addShotType,
  addSwingType,
  moveShotType,
  moveSwingType,
  removeShotType,
  removeSwingType,
  renameSwingType,
  updateShotType,
} from '../data/actions';
import { activeShotTypes, swingsOf } from '../data/selectors';
import { useStore } from '../data/store';
import type { ShotType } from '../data/types';
import { uid } from '../lib/uid';

/** Settings section for shot types and the swings under each. */
export function ShotTypesEditor() {
  const { state, update } = useStore();
  const dialog = useDialog();
  const [newType, setNewType] = useState('');
  const types = activeShotTypes(state);

  const add = () => {
    const name = newType.trim();
    if (!name) return;
    update((s) => addShotType(s, uid(), name, uid()));
    setNewType('');
  };

  const remove = async (t: ShotType) => {
    if (await dialog.confirm(`Remove shot type "${t.name}" and its swings from all clubs? Past shots keep it.`, { confirmLabel: 'Remove', danger: true })) {
      update((s) => removeShotType(s, t.id));
    }
  };

  return (
    <ul className="card shot-types">
      {types.map((t, i) => (
        <li key={t.id} className="shot-type-block">
          <div className="edit-row">
            <input className="shot-type-name" value={t.name} aria-label="Shot type name" onChange={(e) => update((s) => updateShotType(s, t.id, { name: e.target.value }))} />
            <button className="icon-btn" disabled={i === 0} onClick={() => update((s) => moveShotType(s, t.id, -1))} aria-label={`Move ${t.name} up`}>
              ▲
            </button>
            <button className="icon-btn" disabled={i === types.length - 1} onClick={() => update((s) => moveShotType(s, t.id, 1))} aria-label={`Move ${t.name} down`}>
              ▼
            </button>
            <button className="icon-btn danger" disabled={types.length <= 1} onClick={() => remove(t)} aria-label={`Remove ${t.name}`}>
              ✕
            </button>
          </div>
          <label className="toggle toggle-sub">
            <input type="checkbox" checked={t.tracksDistance} onChange={(e) => update((s) => updateShotType(s, t.id, { tracksDistance: e.target.checked }))} />
            <span>Record carry &amp; total distance</span>
          </label>
          <SwingList shotType={t} />
        </li>
      ))}
      <li className="inline-add">
        <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Add shot type, e.g. Flop" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-small" disabled={!newType.trim()} onClick={add}>
          Add
        </button>
      </li>
    </ul>
  );
}

function SwingList({ shotType }: { shotType: ShotType }) {
  const { state, update } = useStore();
  const dialog = useDialog();
  const [newSwing, setNewSwing] = useState('');
  const swings = swingsOf(state, shotType.id);
  const single = swings.length === 1;

  const add = () => {
    const name = newSwing.trim();
    if (!name) return;
    update((s) => addSwingType(s, uid(), shotType.id, name));
    setNewSwing('');
  };

  const remove = async (id: string, name: string) => {
    if (await dialog.confirm(`Remove "${name}" from ${shotType.name} on all clubs? Past shots keep it.`, { confirmLabel: 'Remove', danger: true })) {
      update((s) => removeSwingType(s, id));
    }
  };

  return (
    <div className="swing-list">
      <div className="muted small">{single ? 'Single swing (add more to choose between them in sessions)' : 'Swings'}</div>
      {swings.map((w, i) => (
        <div key={w.id} className="edit-row">
          <input value={w.name} aria-label={`${shotType.name} swing name`} onChange={(e) => update((s) => renameSwingType(s, w.id, e.target.value))} />
          <button className="icon-btn" disabled={i === 0} onClick={() => update((s) => moveSwingType(s, w.id, -1))} aria-label={`Move ${w.name} up`}>
            ▲
          </button>
          <button className="icon-btn" disabled={i === swings.length - 1} onClick={() => update((s) => moveSwingType(s, w.id, 1))} aria-label={`Move ${w.name} down`}>
            ▼
          </button>
          {/* A shot type always keeps at least one swing. */}
          <button className="icon-btn danger" disabled={single} onClick={() => remove(w.id, w.name)} aria-label={`Remove ${w.name}`}>
            ✕
          </button>
        </div>
      ))}
      <div className="inline-add">
        <input value={newSwing} onChange={(e) => setNewSwing(e.target.value)} placeholder={`Add swing to ${shotType.name}`} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-small" disabled={!newSwing.trim()} onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
