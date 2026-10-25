import { clamp } from "../mapping/gestureMapping";
type Point3 = { x: number; y: number; z?: number };
export function fingerOpenness(points: Point3[]): number {
  if (points.length < 21) return 0.5;
  let sum = 0;
  for (const base of [5, 9, 13, 17]) {
    const a = points[base],
      b = points[base + 1],
      c = points[base + 3];
    const u = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
    const v = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
    const length = Math.hypot(...u) * Math.hypot(...v);
    if (length < 1e-8) {
      sum += 0.5;
      continue;
    }
    const angle = Math.acos(
      clamp(u.reduce((n, x, i) => n + x * v[i], 0) / length, -1, 1),
    );
    sum += clamp((angle - 0.8) / (Math.PI - 0.8));
  }
  return sum / 4;
}
