import { uid } from '../lib/uid';
import type { AppState, ClubCategory, ShotType, SwingType } from './types';

export interface ShotTypeSeed {
  name: string;
  tracksDistance: boolean;
  swings: string[];
}

export const DEFAULT_SHOT_TYPES: ShotTypeSeed[] = [
  { name: 'Full Swing', tracksDistance: true, swings: ['Full'] },
  { name: 'Pitch', tracksDistance: true, swings: ['3/4', '1/2', '1/4'] },
  { name: 'Chip', tracksDistance: true, swings: ['Short (0m - 3m)', 'Medium (4m - 7m)', 'Long (8m - 11m)', 'Extra Long (12m+)'] },
  { name: 'Bunker', tracksDistance: true, swings: ['Short (5m)', 'Medium (10m)', 'Long (15m)'] },
  { name: 'Putt', tracksDistance: false, swings: ['Standard'] },
];

export const DEFAULT_RESULTS = [
  { name: 'Good', color: '#2f9e44' },
  { name: 'Ok', color: '#1c7ed6' },
  { name: 'Fat', color: '#a0522d' },
  { name: 'Thin', color: '#e8a400' },
  { name: 'Shank', color: '#e03131' },
];

export function seedShotTypes(): { shotTypes: ShotType[]; swingTypes: SwingType[] } {
  const shotTypes: ShotType[] = [];
  const swingTypes: SwingType[] = [];
  DEFAULT_SHOT_TYPES.forEach((seed, i) => {
    const id = uid();
    shotTypes.push({ id, name: seed.name, sortOrder: i * 10, tracksDistance: seed.tracksDistance });
    seed.swings.forEach((name, j) => swingTypes.push({ id: uid(), shotTypeId: id, name, sortOrder: j * 10 }));
  });
  return { shotTypes, swingTypes };
}

export function initialState(): AppState {
  return {
    version: 2,
    clubs: [],
    ...seedShotTypes(),
    resultTypes: DEFAULT_RESULTS.map((r, i) => ({ id: uid(), ...r, sortOrder: i })),
    sessions: [],
    shots: [],
    activeSessionId: null,
  };
}

export interface ClubPreset {
  name: string;
  category: ClubCategory;
}

const woods = ['Driver', '3 Wood', '4 Wood', '5 Wood', '7 Wood', '9 Wood'];
const hybrids = ['2 Hybrid', '3 Hybrid', '4 Hybrid', '5 Hybrid', '6 Hybrid'];
const irons = ['2 Iron', '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron'];
const wedges = [
  'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge',
  '46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°',
];

/** Ordered longest to shortest; the index drives default bag order. */
export const CLUB_PRESETS: ClubPreset[] = [
  ...woods.map((name) => ({ name, category: 'Wood' as const })),
  ...hybrids.map((name) => ({ name, category: 'Hybrid' as const })),
  ...irons.map((name) => ({ name, category: 'Iron' as const })),
  ...wedges.map((name) => ({ name, category: 'Wedge' as const })),
  { name: 'Putter', category: 'Putter' },
];

export const STANDARD_SET = [
  'Driver', '3 Wood', '4 Hybrid', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'Pitching Wedge', '52°', '56°', '60°', 'Putter',
];

/** Shot types a new club starts with; every swing of each is switched on. */
export const DEFAULT_SHOT_TYPES_BY_CATEGORY: Record<ClubCategory, string[]> = {
  Wood: ['Full Swing'],
  Hybrid: ['Full Swing'],
  Iron: ['Full Swing', 'Pitch'],
  Wedge: ['Full Swing', 'Pitch', 'Chip', 'Bunker'],
  Putter: ['Putt'],
  Other: ['Full Swing'],
};

/** Presets sort by list position; custom clubs go at the end of their category. */
export function defaultSortOrder(name: string, category: ClubCategory): number {
  const i = CLUB_PRESETS.findIndex((p) => p.name === name);
  if (i >= 0) return i * 10;
  let last = -1;
  CLUB_PRESETS.forEach((p, idx) => {
    if (p.category === category) last = idx;
  });
  return last >= 0 ? last * 10 + 5 : CLUB_PRESETS.length * 10 + 5;
}
