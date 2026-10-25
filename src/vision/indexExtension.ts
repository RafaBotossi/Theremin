import type { Hand, Point } from "../types/theremin";

// World landmarks keep the bend measurement independent of camera aspect ratio.
export function indexExtension(points: (Point & { z?: number })[]) {
  const finger = points.slice(5, 9);
  if (
    finger.length !== 4 ||
    finger.some((p) => !p || ![p.x, p.y, p.z ?? 0].every(Number.isFinite))
  )
    return 0;
  const distance = (a: number, b: number) =>
    Math.hypot(
      points[a].x - points[b].x,
      points[a].y - points[b].y,
      (points[a].z ?? 0) - (points[b].z ?? 0),
    );
  const segments = [distance(5, 6), distance(6, 7), distance(7, 8)];
  if (segments.some((length) => length <= 1e-8)) return 0;
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
  // Whole-finger reach tolerates a natural curve and noisy short distal bones.
  // Joint guards still reject a hooked fingertip or a folded middle joint.
  const reach = distance(5, 8) / segments.reduce((sum, n) => sum + n, 0);
  return Math.min(1, reach, angle(5, 6, 7) / 0.78, angle(6, 7, 8) / 0.67);
}

export function selectWand(hands: Hand[], previous?: Hand) {
  const previousTip = previous?.landmarks[8];
  const distanceFromPrevious = (h: Hand) =>
    previousTip && h.landmarks[8]
      ? Math.hypot(
          h.landmarks[8].x - previousTip.x,
          h.landmarks[8].y - previousTip.y,
        )
      : Infinity;
  const nearest = previousTip
    ? hands.reduce<Hand | undefined>(
        (best, h) =>
          !best || distanceFromPrevious(h) < distanceFromPrevious(best)
            ? h
            : best,
        undefined,
      )
    : undefined;
  const candidates = hands.filter((h) => {
    const tip = h.landmarks[8];
    return (
      tip &&
      Number.isFinite(tip.x) &&
      Number.isFinite(tip.y) &&
      (h.indexExtension ?? indexExtension(h.landmarks)) >=
        (h === nearest && distanceFromPrevious(h) < 0.15 ? 0.9 : 0.93)
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
