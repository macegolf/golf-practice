import type { AppState, ResultType, Shot } from '../data/types';

export interface TallyRow {
  result: ResultType;
  count: number;
  share: number;
}

export interface Tally {
  rows: TallyRow[];
  total: number;
}

/** Counts per result type. Archived results only appear when they were used. */
export function tally(state: AppState, shots: Shot[]): Tally {
  const counts = new Map<string, number>();
  for (const sh of shots) counts.set(sh.resultId, (counts.get(sh.resultId) ?? 0) + 1);
  const total = shots.length;
  const rows = [...state.resultTypes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => !r.archived || counts.has(r.id))
    .map((result) => {
      const count = counts.get(result.id) ?? 0;
      return { result, count, share: total ? count / total : 0 };
    });
  return { rows, total };
}

export interface ShotGroup {
  clubId: string;
  swingTypeId: string;
  shots: Shot[];
}

/** Groups shots by club + swing, in the order each pair was first hit. */
export function groupByClubSwing(shots: Shot[]): ShotGroup[] {
  const groups = new Map<string, ShotGroup>();
  for (const sh of [...shots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = `${sh.clubId}|${sh.swingTypeId}`;
    let g = groups.get(key);
    if (!g) {
      g = { clubId: sh.clubId, swingTypeId: sh.swingTypeId, shots: [] };
      groups.set(key, g);
    }
    g.shots.push(sh);
  }
  return [...groups.values()];
}
