// Keep in sync with backend positionMath.EPS
export const POS_EPS = 1e-8;

export function hasLong(h) {
  return (h?.quantity || 0) > POS_EPS;
}

export function hasShort(h) {
  return (h?.shortQuantity || 0) > POS_EPS;
}

export function positionSide(h) {
  if (!h) return null;
  if (h.positionSide) return h.positionSide;
  if (hasLong(h) && hasShort(h)) return 'MIXED';
  if (hasShort(h)) return 'SHORT';
  if (hasLong(h)) return 'LONG';
  return null;
}
