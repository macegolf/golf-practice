// Per-device choice of which end of the Stats dashboard bars the first result
// (e.g. Good) sits at.
export type BarOrder = 'first-bottom' | 'first-top';

const KEY = 'golf-practice-bar-order';

export function getBarOrder(): BarOrder {
  try {
    return localStorage.getItem(KEY) === 'first-top' ? 'first-top' : 'first-bottom';
  } catch {
    return 'first-bottom';
  }
}

export function setBarOrder(o: BarOrder) {
  try {
    if (o === 'first-bottom') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, o);
  } catch {
    // choice just won't persist
  }
}
