import { useRef, useState } from 'react';
import { useDialog } from '../components/Dialog';
import { PageHeader } from '../components/Layout';
import { ShotTypesEditor } from '../components/ShotTypesEditor';
import { addResultType, moveResultType, removeResultType, updateResultType } from '../data/actions';
import { initialState } from '../data/defaults';
import { migrate } from '../data/migrate';
import { activeResults } from '../data/selectors';
import { useStore, type SyncStatus } from '../data/store';
import { localDateInput } from '../lib/format';
import { clickSoundEnabled, playClick, setClickSound } from '../lib/feedback';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import { uid } from '../lib/uid';

export default function Settings() {
  const { state, update, replace, sync } = useStore();
  const dialog = useDialog();
  const [newResult, setNewResult] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const results = activeResults(state);

  const addResult = () => {
    const name = newResult.trim();
    if (!name) return;
    update((s) => addResultType(s, uid(), name, '#6c757d'));
    setNewResult('');
  };

  const removeResult = async (id: string, name: string) => {
    const used = state.shots.some((s) => s.resultId === id);
    const msg = used
      ? `Remove "${name}"? It won't be offered in new sessions, but past shots keep it.`
      : `Remove "${name}"?`;
    if (await dialog.confirm(msg, { confirmLabel: 'Remove', danger: true })) update((s) => removeResultType(s, id));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf-practice-backup-${localDateInput()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const parsed = migrate(JSON.parse(await file.text()));
      if (!parsed) throw new Error('bad format');
      if (await dialog.confirm('Replace all current data with this backup?', { confirmLabel: 'Replace', danger: true })) replace(parsed);
    } catch {
      await dialog.alert("That file isn't a valid Golf Practice backup.");
    }
  };

  const reset = async () => {
    if (await dialog.confirm('Delete ALL clubs, sessions and shots? This cannot be undone.', { confirmLabel: 'Delete everything', danger: true })) {
      replace(initialState());
    }
  };

  return (
    <>
      <PageHeader title="Settings" />

      <section className="section">
        <h2>Appearance</h2>
        <AppearancePicker />
        <p className="muted small">Light is usually easier to read in bright sun. Saved on this device only.</p>
      </section>

      <section className="section">
        <h2>Shot results</h2>
        <p className="muted small">These are the buttons you tap after each shot.</p>
        <ul className="card edit-list">
          {results.map((r, i) => (
            <li key={r.id}>
              <input type="color" value={r.color} aria-label={`${r.name} colour`} onChange={(e) => update((s) => updateResultType(s, r.id, { color: e.target.value }))} />
              <input value={r.name} aria-label="Result name" onChange={(e) => update((s) => updateResultType(s, r.id, { name: e.target.value }))} />
              <button className="icon-btn" disabled={i === 0} onClick={() => update((s) => moveResultType(s, r.id, -1))} aria-label="Move up">
                ▲
              </button>
              <button className="icon-btn" disabled={i === results.length - 1} onClick={() => update((s) => moveResultType(s, r.id, 1))} aria-label="Move down">
                ▼
              </button>
              <button className="icon-btn danger" disabled={results.length <= 1} onClick={() => removeResult(r.id, r.name)} aria-label={`Remove ${r.name}`}>
                ✕
              </button>
            </li>
          ))}
          <li className="inline-add">
            <input value={newResult} onChange={(e) => setNewResult(e.target.value)} placeholder="Add result, e.g. Top" onKeyDown={(e) => e.key === 'Enter' && addResult()} />
            <button className="btn btn-small" disabled={!newResult.trim()} onClick={addResult}>
              Add
            </button>
          </li>
        </ul>
        <ClickSoundToggle />
      </section>

      <section className="section">
        <h2>Shot types</h2>
        <p className="muted small">
          Each shot type has one or more swings, e.g. Pitch → 3/4, 1/2, 1/4. Turn them on per club in My Bag.
        </p>
        <ShotTypesEditor />
      </section>

      {sync.user && (
        <section className="section">
          <h2>Account</h2>
          <div className="card stack">
            <div>
              Signed in as <strong>{sync.user.email}</strong>
            </div>
            <button
              className="btn btn-block"
              onClick={async () => {
                if (await dialog.confirm('Sign out on this device? Your data stays saved in your account.', { confirmLabel: 'Sign out' })) {
                  await sync.signOut();
                }
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      )}

      <section className="section">
        <h2>Data</h2>
        <div className="card stack">
          <SyncStatusLine />
          <button className="btn btn-block" onClick={exportData}>
            Export backup
          </button>
          <button className="btn btn-block" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = '';
            }}
          />
          <button className="btn btn-danger btn-block" onClick={reset}>
            Reset all data
          </button>
        </div>
      </section>
    </>
  );
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  'local-only': 'Saved on this device only (cloud sync not set up).',
  loading: 'Loading your data…',
  synced: 'All changes saved to your account.',
  saving: 'Saving…',
  offline: "Offline. Changes are saved on this device and will sync when you're back online.",
  error: "Couldn't reach the server. Changes are saved on this device and will retry.",
};

function SyncStatusLine() {
  const { sync } = useStore();
  return (
    <div className="sync-status small">
      <span className={`sync-dot ${sync.status}`} aria-hidden />
      <span>{STATUS_TEXT[sync.status]}</span>
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Automatic' },
];

function AppearancePicker() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const choose = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };
  return (
    <div className="segmented" role="radiogroup" aria-label="Appearance">
      {THEME_OPTIONS.map((o) => (
        <button key={o.value} role="radio" aria-checked={theme === o.value} className={theme === o.value ? 'on' : ''} onClick={() => choose(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ClickSoundToggle() {
  const [on, setOn] = useState(clickSoundEnabled);
  return (
    <label className="card toggle setting-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setClickSound(e.target.checked);
          setOn(e.target.checked);
          // Play a sample so the volume can be checked straight away.
          if (e.target.checked) playClick();
        }}
      />
      <span>
        Play audible 'click' on tap
        <span className="muted small setting-hint">Plays with the vibration when you tap a result. Saved on this device only.</span>
      </span>
    </label>
  );
}
