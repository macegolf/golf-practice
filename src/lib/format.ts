export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(startIso: string, endIso: string | null): string {
  const end = endIso ? new Date(endIso) : new Date();
  const mins = Math.max(0, Math.round((end.getTime() - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function metres(n: number | null): string {
  return n == null ? '–' : `${n} m`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function localDateInput(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
