/**
 * Géométrie pour indicateurs de séances hors viewport (carte Mapbox).
 * Coordonnées écran : origine haut-gauche du conteneur carte, comme map.project().
 */

export type MapInnerRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Point projeté Mapbox (px). */
export function isProjectedPointInInnerRect(
  px: number,
  py: number,
  r: MapInnerRect,
): boolean {
  return px >= r.minX && px <= r.maxX && py >= r.minY && py <= r.maxY;
}

/**
 * Intersection du rayon (centre → cible) avec le bord intérieur du rectangle.
 * (cx,cy) = centre zone utile ; (tx,ty) = position projetée de la cible (peut être hors écran).
 */
export function rayExitOnInnerRect(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  r: MapInnerRect,
): { x: number; y: number } {
  let dx = tx - cx;
  let dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { x: (r.minX + r.maxX) / 2, y: r.minY };
  }
  dx /= len;
  dy /= len;

  let tHit = Infinity;
  const tryT = (t: number) => {
    if (t >= 0 && Number.isFinite(t)) tHit = Math.min(tHit, t);
  };

  if (dx > 1e-9) tryT((r.maxX - cx) / dx);
  if (dx < -1e-9) tryT((r.minX - cx) / dx);
  if (dy > 1e-9) tryT((r.maxY - cy) / dy);
  if (dy < -1e-9) tryT((r.minY - cy) / dy);

  if (!Number.isFinite(tHit) || tHit === Infinity) {
    return { x: cx, y: r.minY };
  }

  const x = cx + tHit * dx;
  const y = cy + tHit * dy;
  return {
    x: Math.min(r.maxX, Math.max(r.minX, x)),
    y: Math.min(r.maxY, Math.max(r.minY, y)),
  };
}

/** Bearing en degrés, 0 = Est, 90 = Sud (repère écran y vers le bas). */
export function screenBearingDeg(cx: number, cy: number, tx: number, ty: number): number {
  const dx = tx - cx;
  const dy = ty - cy;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function angularDistanceDeg(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
