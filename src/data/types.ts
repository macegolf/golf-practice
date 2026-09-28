export type ClubCategory = 'Wood' | 'Hybrid' | 'Iron' | 'Wedge' | 'Putter' | 'Other';

export const CATEGORIES: ClubCategory[] = ['Wood', 'Hybrid', 'Iron', 'Wedge', 'Putter', 'Other'];

/** Full Swing, Pitch, Chip, Bunker, Putt, or user-defined. */
export interface ShotType {
  id: string;
  name: string;
  sortOrder: number;
  /** Whether clubs record carry/total for this shot type (off for Putt). */
  tracksDistance: boolean;
  archived?: boolean;
}

/**
 * A swing within a shot type, e.g. Pitch → 3/4. Every shot type has at least one;
 * a shot type with a single swing is shown by the shot type name alone.
 */
export interface SwingType {
  id: string;
  shotTypeId: string;
  name: string;
  /** Order within its shot type. */
  sortOrder: number;
  archived?: boolean;
}

/** Distances for one swing on one club, in metres. */
export interface ClubSwing {
  swingTypeId: string;
  carry: number | null;
  total: number | null;
}

export interface Club {
  id: string;
  name: string;
  category: ClubCategory;
  sortOrder: number;
  swings: ClubSwing[];
  archived?: boolean;
}

export interface ResultType {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  archived?: boolean;
}

export interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  location: string;
  note: string;
  /** Clubs chosen for this session. Missing on older sessions, meaning the whole bag. */
  clubIds?: string[];
}

export interface Shot {
  id: string;
  sessionId: string;
  clubId: string;
  swingTypeId: string;
  resultId: string;
  createdAt: string;
}

export interface AppState {
  version: 2;
  clubs: Club[];
  shotTypes: ShotType[];
  swingTypes: SwingType[];
  resultTypes: ResultType[];
  sessions: Session[];
  shots: Shot[];
  activeSessionId: string | null;
}
