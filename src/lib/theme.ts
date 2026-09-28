// Per-device appearance choice. index.html applies it before first paint too.
export type Theme = 'system' | 'light' | 'dark';

const KEY = 'golf-practice-theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    // storage blocked
  }
  return 'system';
}

export function setTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // choice just won't persist
  }
  applyTheme(t);
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}
