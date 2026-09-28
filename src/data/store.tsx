import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { initialState } from './defaults';
import { migrate } from './migrate';
import type { AppState } from './types';

// Every change is saved to localStorage immediately (works offline at the range),
// then pushed to Supabase as one row per user. Last write wins between devices.
const STORAGE_KEY = 'golf-practice-v1';
const META_KEY = 'golf-practice-sync';
const PUSH_DELAY_MS = 800;

export type SyncStatus = 'local-only' | 'loading' | 'synced' | 'saving' | 'offline' | 'error';

interface SyncMeta {
  /** Account the local copy belongs to. */
  userId: string | null;
  /** Local changes not yet in the cloud. */
  dirty: boolean;
  /** When the local copy last changed or was synced. */
  updatedAt: string | null;
}

function readMeta(): SyncMeta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? 'null');
    if (m && typeof m === 'object') return { userId: m.userId ?? null, dirty: !!m.dirty, updatedAt: m.updatedAt ?? null };
  } catch {
    // ignore
  }
  return { userId: null, dirty: false, updatedAt: null };
}

function writeMeta(m: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // storage blocked
  }
}

function backup(label: string, raw: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${label}-${Date.now()}`, raw);
  } catch {
    // nothing more we can do
  }
}

function load(): AppState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const migrated = migrate(JSON.parse(raw));
      if (migrated) return migrated;
    }
  } catch {
    // corrupt or unavailable storage
  }
  // Starting fresh would overwrite unreadable data on the next save, so keep a copy.
  if (raw) backup('unreadable', raw);
  return initialState();
}

const hasData = (s: AppState) => s.clubs.length > 0 || s.sessions.length > 0;

interface SyncInfo {
  /** Supabase is configured for this build. */
  enabled: boolean;
  /** The initial auth check has finished. */
  authReady: boolean;
  user: User | null;
  status: SyncStatus;
  /** Set while the user is following a password-reset link. */
  recovering: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
}

interface StoreValue {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  sync: SyncInfo;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'loading' : 'local-only');
  const [recovering, setRecovering] = useState(false);

  const userId = authSession?.user.id ?? null;
  const stateRef = useRef(state);
  stateRef.current = state;
  /** JSON of the state last known to match the cloud; changes against it need pushing. */
  const syncedJson = useRef<string | null>(null);
  /** True once the cloud copy has been loaded for the current user. */
  const remoteReady = useRef(false);
  const pushTimer = useRef<number | undefined>(undefined);

  const push = useCallback(async (uid: string) => {
    if (!supabase) return;
    const snapshot = stateRef.current;
    const json = JSON.stringify(snapshot);
    if (json === syncedJson.current) return;
    setStatus('saving');
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from('app_state').upsert({ user_id: uid, data: snapshot, updated_at: updatedAt });
    if (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      return;
    }
    syncedJson.current = json;
    // Only clear dirty if nothing changed while the request was in flight.
    const stillCurrent = JSON.stringify(stateRef.current) === json;
    writeMeta({ userId: uid, dirty: !stillCurrent, updatedAt });
    setStatus(stillCurrent ? 'synced' : 'saving');
    if (!stillCurrent) push(uid);
  }, []);

  /** Loads the cloud copy and reconciles it with the local one. */
  const pull = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data, error } = await supabase.from('app_state').select('data, updated_at').eq('user_id', uid).maybeSingle();
      if (error) {
        setStatus(navigator.onLine ? 'error' : 'offline');
        return;
      }
      const meta = readMeta();
      const local = stateRef.current;
      const remote = data ? migrate(data.data) : null;
      const sameAccount = meta.userId === uid;
      const localIsNewer = sameAccount && meta.dirty && !!meta.updatedAt && (!data || meta.updatedAt > data.updated_at);

      remoteReady.current = true;
      if (!remote || localIsNewer || (!hasData(remote) && hasData(local))) {
        // First sign-in with this account, unsynced offline changes, or an empty cloud copy.
        syncedJson.current = null;
        await push(uid);
        return;
      }
      if (!sameAccount && hasData(local) && JSON.stringify(local) !== JSON.stringify(remote)) {
        // This device has other data; keep a copy before the account's data replaces it.
        backup('before-sign-in', JSON.stringify(local));
      }
      syncedJson.current = JSON.stringify(remote);
      writeMeta({ userId: uid, dirty: false, updatedAt: data!.updated_at });
      setState(remote);
      setStatus('synced');
    },
    [push],
  );

  // Save locally on every change, and schedule a cloud push when signed in.
  useEffect(() => {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {
      // storage full or blocked
    }
    if (!supabase || !userId || !remoteReady.current || json === syncedJson.current) return;
    writeMeta({ userId, dirty: true, updatedAt: new Date().toISOString() });
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => push(userId), PUSH_DELAY_MS);
  }, [state, userId, push]);

  // Track the signed-in user.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthSession(session);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the cloud copy whenever the user changes.
  useEffect(() => {
    remoteReady.current = false;
    syncedJson.current = null;
    if (!userId) {
      if (supabase) setStatus('loading');
      return;
    }
    setStatus('loading');
    pull(userId);
  }, [userId, pull]);

  // Catch up when the connection returns or the app is reopened (e.g. after another device).
  useEffect(() => {
    if (!supabase || !userId) return;
    const catchUp = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (!remoteReady.current || !readMeta().dirty) pull(userId);
      else push(userId);
    };
    const offline = () => setStatus('offline');
    window.addEventListener('online', catchUp);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', catchUp);
    return () => {
      window.removeEventListener('online', catchUp);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', catchUp);
    };
  }, [userId, pull, push]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((prev) => fn(prev)), []);
  const replace = useCallback((s: AppState) => setState(s), []);
  const signOut = useCallback(async () => {
    window.clearTimeout(pushTimer.current);
    if (userId && readMeta().dirty) await push(userId);
    await supabase?.auth.signOut();
  }, [userId, push]);
  const finishRecovery = useCallback(() => setRecovering(false), []);

  const sync: SyncInfo = {
    enabled: !!supabase,
    authReady,
    user: authSession?.user ?? null,
    status,
    recovering,
    finishRecovery,
    signOut,
  };

  return <StoreContext.Provider value={{ state, update, replace, sync }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
