import type { Point } from "../types/theremin";
// A deliberate thumb spread adds optional vibrato, independent of index pitch.
export function thumbVibrato(points: (Point & { z?: number })[]) {
  const distance = (a: number, b: number) => {
    const p = points[a],
      q = points[b];
    return p && q
      ? Math.hypot(p.x - q.x, p.y - q.y, (p.z ?? 0) - (q.z ?? 0))
      : 0;
  };
  const palm = distance(5, 17);
  if (palm < 1e-6) return 0;
  return Math.max(0, Math.min(1, (distance(4, 5) / palm - 0.65) / 0.7));
}
