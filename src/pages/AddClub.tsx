import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { addClub } from '../data/actions';
import { CLUB_PRESETS } from '../data/defaults';
import { bagClubs } from '../data/selectors';
import { useStore } from '../data/store';
import { CATEGORIES, type ClubCategory } from '../data/types';
import { uid } from '../lib/uid';

export default function AddClub() {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const inBag = new Set(bagClubs(state).map((c) => c.name));
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState<ClubCategory>('Iron');

  const add = (name: string, category: ClubCategory) => update((s) => addClub(s, uid(), name, category));

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const id = uid();
    update((s) => addClub(s, id, name, customCat));
    navigate(`/bag/${id}`);
  };

  return (
    <>
      <PageHeader title="Add clubs" back="/bag" />
      <p className="muted small pad">Tap to add. You can set distances and swing types afterwards.</p>
      {CATEGORIES.filter((c) => c !== 'Other').map((cat) => (
        <section key={cat} className="section">
          <h2>{cat === 'Putter' ? 'Putter' : `${cat}s`}</h2>
          <div className="chip-grid">
            {CLUB_PRESETS.filter((p) => p.category === cat).map((p) => {
              const has = inBag.has(p.name);
              return (
                <button key={p.name} className={`chip${has ? ' chip-on' : ''}`} disabled={has} onClick={() => add(p.name, p.category)}>
                  {has ? '✓ ' : '+ '}
                  {p.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <section className="section card">
        <h2>Custom club</h2>
        <label className="field">
          <span>Name</span>
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Driving Iron" />
        </label>
        <label className="field">
          <span>Type</span>
          <select value={customCat} onChange={(e) => setCustomCat(e.target.value as ClubCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" disabled={!customName.trim()} onClick={addCustom}>
          Add custom club
        </button>
      </section>
      <div className="pad">
        <button className="btn btn-block" onClick={() => navigate('/bag')}>
          Done
        </button>
      </div>
    </>
  );
}
