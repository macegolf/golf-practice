import { uid } from '../lib/uid';
import type { AppState, Club, ShotType, SwingType } from './types';

type V1SwingType = { id: string; name: string; sortOrder: number; archived?: boolean };
type V1State = Omit<AppState, 'version' | 'shotTypes' | 'swingTypes'> & { version: 1; swingTypes: V1SwingType[] };

function hasCoreArrays(s: Partial<AppState>): boolean {
  return (
    Array.isArray(s.clubs) &&
    Array.isArray(s.swingTypes) &&
    Array.isArray(s.resultTypes) &&
    Array.isArray(s.sessions) &&
    Array.isArray(s.shots)
  );
}

/** Returns current-version state from saved or imported data, or null if unrecognised. */
export function migrate(raw: unknown): AppState | null {
  const s = raw as Partial<AppState>;
  if (!s || !hasCoreArrays(s)) return null;
  const version: unknown = (raw as { version?: unknown }).version;
  if (version === 2 && Array.isArray(s.shotTypes)) return { ...(s as AppState), activeSessionId: s.activeSessionId ?? null };
  if (version === 1) return fromV1(s as unknown as V1State);
  return null;
}

/**
 * v1 had flat swing types. Group them under shot types, keeping every swing id so
 * shots and club distances carry over untouched:
 * Full → Full Swing, 1/4 · 1/2 · 3/4 → Pitch, Putt → Putt, anything custom → its own shot type.
 */
function fromV1(s: V1State): AppState {
  const mk = (name: string, sortOrder: number, tracksDistance = true): ShotType => ({ id: uid(), name, sortOrder, tracksDistance });
  const full = mk('Full Swing', 0);
  const pitch = mk('Pitch', 10);
  const chip = mk('Chip', 20);
  const bunker = mk('Bunker', 30);
  const putt = mk('Putt', 40, false);
  const shotTypes: ShotType[] = [full, pitch, chip, bunker, putt];
  const pitchOrder: Record<string, number> = { '3/4': 0, '1/2': 10, '1/4': 20 };

  const swingTypes: SwingType[] = s.swingTypes.map((t, i) => {
    if (t.name === 'Full') return { ...t, shotTypeId: full.id, sortOrder: 0 };
    if (t.name in pitchOrder) return { ...t, shotTypeId: pitch.id, sortOrder: pitchOrder[t.name] };
    if (t.name === 'Putt') return { ...t, shotTypeId: putt.id, name: 'Standard', sortOrder: 0 };
    const own = mk(t.name, 50 + i * 10);
    if (t.archived) own.archived = true;
    shotTypes.push(own);
    return { ...t, shotTypeId: own.id, sortOrder: 0 };
  });

  // Every shot type needs at least one active swing.
  for (const type of shotTypes) {
    if (!type.archived && !swingTypes.some((w) => w.shotTypeId === type.id && !w.archived)) {
      swingTypes.push({ id: uid(), shotTypeId: type.id, name: type === full ? 'Full' : 'Standard', sortOrder: 0 });
    }
  }

  const chipSwing = swingTypes.find((w) => w.shotTypeId === chip.id)!;
  const bunkerSwing = swingTypes.find((w) => w.shotTypeId === bunker.id)!;
  const clubs: Club[] = s.clubs.map((c) =>
    c.category === 'Wedge'
      ? {
          ...c,
          swings: [
            ...c.swings,
            { swingTypeId: chipSwing.id, carry: null, total: null },
            { swingTypeId: bunkerSwing.id, carry: null, total: null },
          ],
        }
      : c,
  );

  return { ...s, version: 2, clubs, shotTypes, swingTypes, activeSessionId: s.activeSessionId ?? null };
}
