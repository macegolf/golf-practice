// Pure state transitions. Each takes the current state and returns a new one.
import { DEFAULT_SHOT_TYPES_BY_CATEGORY, defaultSortOrder } from './defaults';
import type { AppState, Club, ClubCategory, ClubSwing, ResultType, Session, Shot, ShotType } from './types';

// ---- Clubs ----

/** Every active swing of the category's default shot types. */
export function defaultSwingsFor(s: AppState, category: ClubCategory): ClubSwing[] {
  const typeIds = new Set(
    DEFAULT_SHOT_TYPES_BY_CATEGORY[category]
      .map((n) => s.shotTypes.find((t) => t.name === n && !t.archived)?.id)
      .filter((id): id is string => !!id),
  );
  return s.swingTypes
    .filter((w) => typeIds.has(w.shotTypeId) && !w.archived)
    .map((w) => ({ swingTypeId: w.id, carry: null, total: null }));
}

export function addClub(s: AppState, id: string, name: string, category: ClubCategory): AppState {
  const club: Club = {
    id,
    name,
    category,
    sortOrder: defaultSortOrder(name, category),
    swings: defaultSwingsFor(s, category),
  };
  return { ...s, clubs: [...s.clubs, club] };
}

export function updateClub(s: AppState, id: string, patch: Partial<Omit<Club, 'id'>>): AppState {
  return { ...s, clubs: s.clubs.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

/** Clubs with recorded shots are archived so history keeps its labels. */
export function removeClub(s: AppState, id: string): AppState {
  if (s.shots.some((sh) => sh.clubId === id)) return updateClub(s, id, { archived: true });
  return { ...s, clubs: s.clubs.filter((c) => c.id !== id) };
}

export function moveClub(s: AppState, id: string, dir: -1 | 1): AppState {
  return { ...s, clubs: moveInList(s.clubs, id, dir) };
}

// ---- Shot types ----

/** A new shot type starts with one swing so it can be used straight away. */
export function addShotType(s: AppState, id: string, name: string, swingId: string): AppState {
  const sortOrder = Math.max(-10, ...s.shotTypes.map((t) => t.sortOrder)) + 10;
  return {
    ...s,
    shotTypes: [...s.shotTypes, { id, name, sortOrder, tracksDistance: true }],
    swingTypes: [...s.swingTypes, { id: swingId, shotTypeId: id, name: 'Standard', sortOrder: 0 }],
  };
}

export function updateShotType(s: AppState, id: string, patch: Partial<Omit<ShotType, 'id'>>): AppState {
  return { ...s, shotTypes: s.shotTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function moveShotType(s: AppState, id: string, dir: -1 | 1): AppState {
  return { ...s, shotTypes: moveInList(s.shotTypes, id, dir) };
}

/** Removes the shot type and its swings from every club; archives what shots reference. */
export function removeShotType(s: AppState, id: string): AppState {
  const swingIds = s.swingTypes.filter((w) => w.shotTypeId === id).map((w) => w.id);
  const used = s.shots.some((sh) => swingIds.includes(sh.swingTypeId));
  const next = swingIds.reduce((acc, wid) => removeSwingType(acc, wid), s);
  return {
    ...next,
    shotTypes: used
      ? next.shotTypes.map((t) => (t.id === id ? { ...t, archived: true } : t))
      : next.shotTypes.filter((t) => t.id !== id),
  };
}

// ---- Swings (within a shot type) ----

export function addSwingType(s: AppState, id: string, shotTypeId: string, name: string): AppState {
  const siblings = s.swingTypes.filter((w) => w.shotTypeId === shotTypeId);
  const sortOrder = Math.max(-10, ...siblings.map((t) => t.sortOrder)) + 10;
  return { ...s, swingTypes: [...s.swingTypes, { id, shotTypeId, name, sortOrder }] };
}

export function renameSwingType(s: AppState, id: string, name: string): AppState {
  return { ...s, swingTypes: s.swingTypes.map((t) => (t.id === id ? { ...t, name } : t)) };
}

export function moveSwingType(s: AppState, id: string, dir: -1 | 1): AppState {
  const shotTypeId = s.swingTypes.find((w) => w.id === id)?.shotTypeId;
  return { ...s, swingTypes: moveInList(s.swingTypes, id, dir, (w) => w.shotTypeId === shotTypeId) };
}

/** Removes the swing from every club; archives it if shots reference it. */
export function removeSwingType(s: AppState, id: string): AppState {
  const clubs = s.clubs.map((c) => ({ ...c, swings: c.swings.filter((w) => w.swingTypeId !== id) }));
  const used = s.shots.some((sh) => sh.swingTypeId === id);
  const swingTypes = used
    ? s.swingTypes.map((t) => (t.id === id ? { ...t, archived: true } : t))
    : s.swingTypes.filter((t) => t.id !== id);
  return { ...s, clubs, swingTypes };
}

// ---- Result types ----

export function addResultType(s: AppState, id: string, name: string, color: string): AppState {
  const sortOrder = Math.max(-1, ...s.resultTypes.map((t) => t.sortOrder)) + 1;
  return { ...s, resultTypes: [...s.resultTypes, { id, name, color, sortOrder }] };
}

export function updateResultType(s: AppState, id: string, patch: Partial<Omit<ResultType, 'id'>>): AppState {
  return { ...s, resultTypes: s.resultTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function moveResultType(s: AppState, id: string, dir: -1 | 1): AppState {
  return { ...s, resultTypes: moveInList(s.resultTypes, id, dir) };
}

export function removeResultType(s: AppState, id: string): AppState {
  if (s.shots.some((sh) => sh.resultId === id)) return updateResultType(s, id, { archived: true });
  return { ...s, resultTypes: s.resultTypes.filter((t) => t.id !== id) };
}

// ---- Sessions ----

export function startSession(s: AppState, session: Session): AppState {
  return { ...s, sessions: [...s.sessions, session], activeSessionId: session.id };
}

export function updateSession(s: AppState, id: string, patch: Partial<Omit<Session, 'id'>>): AppState {
  return { ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
}

export function endSession(s: AppState, id: string): AppState {
  const next = updateSession(s, id, { endedAt: new Date().toISOString() });
  return { ...next, activeSessionId: s.activeSessionId === id ? null : s.activeSessionId };
}

export function deleteSession(s: AppState, id: string): AppState {
  return {
    ...s,
    sessions: s.sessions.filter((x) => x.id !== id),
    shots: s.shots.filter((sh) => sh.sessionId !== id),
    activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
  };
}

// ---- Shots ----

export function addShot(s: AppState, shot: Shot): AppState {
  return { ...s, shots: [...s.shots, shot] };
}

export function updateShot(s: AppState, id: string, patch: Partial<Omit<Shot, 'id'>>): AppState {
  return { ...s, shots: s.shots.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) };
}

export function deleteShot(s: AppState, id: string): AppState {
  return { ...s, shots: s.shots.filter((sh) => sh.id !== id) };
}

// ---- helpers ----

/** Swaps an item with its neighbour among the non-archived items in its group, then renumbers. */
function moveInList<T extends { id: string; sortOrder: number; archived?: boolean }>(
  items: T[],
  id: string,
  dir: -1 | 1,
  inGroup: (t: T) => boolean = () => true,
): T[] {
  const list = items.filter((t) => !t.archived && inGroup(t)).sort((a, b) => a.sortOrder - b.sortOrder);
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return items;
  [list[i], list[j]] = [list[j], list[i]];
  const order = new Map(list.map((t, idx) => [t.id, idx * 10]));
  return items.map((t) => (order.has(t.id) ? { ...t, sortOrder: order.get(t.id)! } : t));
}
