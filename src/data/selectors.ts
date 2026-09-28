import type { AppState, Club, ClubSwing, ResultType, Session, Shot, ShotType, SwingType } from './types';

const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export function bagClubs(s: AppState): Club[] {
  return s.clubs.filter((c) => !c.archived).sort(bySort);
}

export function activeShotTypes(s: AppState): ShotType[] {
  return s.shotTypes.filter((t) => !t.archived).sort(bySort);
}

/** Active swings of one shot type, in order. */
export function swingsOf(s: AppState, shotTypeId: string): SwingType[] {
  return s.swingTypes.filter((w) => w.shotTypeId === shotTypeId && !w.archived).sort(bySort);
}

/** Shot types with more than one swing (like Pitch) show the swing name as well. */
export function hasSwingChoice(s: AppState, shotTypeId: string): boolean {
  return swingsOf(s, shotTypeId).length > 1;
}

export function activeResults(s: AppState): ResultType[] {
  return s.resultTypes.filter((t) => !t.archived).sort(bySort);
}

/** "Pitch · 1/2", or just "Chip" when the shot type has a single swing. */
export function swingLabel(s: AppState, swingTypeId: string): string {
  const w = s.swingTypes.find((x) => x.id === swingTypeId);
  if (!w) return 'Unknown shot';
  const t = s.shotTypes.find((x) => x.id === w.shotTypeId);
  if (!t) return w.name;
  return w.archived || hasSwingChoice(s, t.id) ? `${t.name} · ${w.name}` : t.name;
}

export interface ClubSwingRow extends ClubSwing {
  shotType: ShotType;
  swing: SwingType;
  label: string;
}

/** A club's enabled swings, ordered by shot type then swing, skipping archived ones. */
export function clubSwings(s: AppState, club: Club): ClubSwingRow[] {
  const rows: ClubSwingRow[] = [];
  for (const cs of club.swings) {
    const swing = s.swingTypes.find((x) => x.id === cs.swingTypeId && !x.archived);
    const shotType = swing && s.shotTypes.find((x) => x.id === swing.shotTypeId && !x.archived);
    if (swing && shotType) rows.push({ ...cs, shotType, swing, label: swingLabel(s, swing.id) });
  }
  return rows.sort((a, b) => a.shotType.sortOrder - b.shotType.sortOrder || a.swing.sortOrder - b.swing.sortOrder);
}

export interface ShotTypeGroup {
  shotType: ShotType;
  rows: ClubSwingRow[];
}

export function groupByShotType(rows: ClubSwingRow[]): ShotTypeGroup[] {
  const groups: ShotTypeGroup[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.shotType.id === r.shotType.id);
    if (g) g.rows.push(r);
    else groups.push({ shotType: r.shotType, rows: [r] });
  }
  return groups;
}

export function clubName(s: AppState, id: string): string {
  return s.clubs.find((c) => c.id === id)?.name ?? 'Unknown club';
}

export function shotTypeOf(s: AppState, swingTypeId: string): ShotType | undefined {
  const w = s.swingTypes.find((x) => x.id === swingTypeId);
  return w && s.shotTypes.find((t) => t.id === w.shotTypeId);
}

export function sessionShots(s: AppState, sessionId: string): Shot[] {
  return s.shots.filter((sh) => sh.sessionId === sessionId);
}

export function sessionsNewestFirst(s: AppState): Session[] {
  return [...s.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function activeSession(s: AppState): Session | undefined {
  return s.activeSessionId ? s.sessions.find((x) => x.id === s.activeSessionId) : undefined;
}
