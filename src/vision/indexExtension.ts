import type { Hand, Point } from "../types/theremin";

// World landmarks keep the bend measurement independent of camera aspect ratio.
export function indexExtension(points: (Point & { z?: number })[]) {
  const angle = (a: number, b: number, c: number) => {
    const p = points[a],
      q = points[b],
      r = points[c];
    if (!p || !q || !r) return 0;
    const u = [p.x - q.x, p.y - q.y, (p.z ?? 0) - (q.z ?? 0)];
    const v = [r.x - q.x, r.y - q.y, (r.z ?? 0) - (q.z ?? 0)];
    const length = Math.hypot(...u) * Math.hypot(...v);
    if (!length) return 0;
    return (
      Math.acos(
        Math.max(
          -1,
          Math.min(1, u.reduce((sum, n, i) => sum + n * v[i], 0) / length),
        ),
      ) / Math.PI
    );
  };
  return Math.min(angle(5, 6, 7), angle(6, 7, 8));
}

export function selectWand(hands: Hand[], previous?: Hand) {
  const candidates = hands.filter((h) => {
    const tip = h.landmarks[8];
    return (
      tip &&
      Number.isFinite(tip.x) &&
      Number.isFinite(tip.y) &&
      (h.indexExtension ?? indexExtension(h.landmarks)) >= 0.86
    );
  });
  // Keep the closest fingertip when detector result order changes.
  if (!previous) return candidates[0];
  const p = previous.landmarks[8];
  return candidates.sort(
    (a, b) =>
      Math.hypot(a.landmarks[8].x - p.x, a.landmarks[8].y - p.y) -
      Math.hypot(b.landmarks[8].x - p.x, b.landmarks[8].y - p.y),
  )[0];
}
