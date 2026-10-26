import type { Hand } from "../types/theremin";
import { hasOpenPalm, palmPoint } from "./openPalm";

type Landmark = { x: number; y: number; z?: number };
const valid = (p: Landmark | undefined): p is Landmark =>
  !!p && [p.x, p.y, p.z ?? 0].every(Number.isFinite);
const distance = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
function palmSize(points: Landmark[]) {
  if (!valid(points[0])) return 0;
  const lengths = [5, 9, 13, 17]
    .filter((i) => valid(points[i]))
    .map((i) => distance(points[0], points[i]))
    .filter((n) => n > 1e-6)
    .sort((a, b) => a - b);
  const middle = Math.floor(lengths.length / 2);
  return lengths.length
    ? (lengths[middle] +
        lengths[Math.max(0, Math.ceil(lengths.length / 2) - 1)]) /
        2
    : 0;
}
// Contact is often pad-to-pad or against the SIDE of the other fingertip.
// Only the distal 35% counts, so touching the base of a folded finger is not a pinch.
function padDistance(
  tip: Landmark,
  otherTip: Landmark,
  joint: Landmark | undefined,
) {
  if (!valid(joint)) return distance(tip, otherTip);
  const v = [
    joint.x - otherTip.x,
    joint.y - otherTip.y,
    (joint.z ?? 0) - (otherTip.z ?? 0),
  ];
  const w = [
    tip.x - otherTip.x,
    tip.y - otherTip.y,
    (tip.z ?? 0) - (otherTip.z ?? 0),
  ];
  const length = v.reduce((sum, n) => sum + n * n, 0);
  const t =
    length > 1e-12
      ? Math.max(
          0,
          Math.min(0.35, v.reduce((sum, n, i) => sum + n * w[i], 0) / length),
        )
      : 0;
  return Math.hypot(...w.map((n, i) => n - v[i] * t));
}
export function pinchRatio(points: Landmark[]) {
  if (![0, 4, 8, 9].every((i) => valid(points[i]))) return Infinity;
  const palm = palmSize(points);
  return palm > 1e-6
    ? Math.max(
        // Side contact may refine the measurement, but cannot erase a visible gap.
        distance(points[4], points[8]) * 0.85,
        Math.min(
          padDistance(points[4], points[8], points[7]),
          padDistance(points[8], points[4], points[3]),
        ),
      ) / palm
    : Infinity;
}
// Image evidence helps when the estimated 3D depth is noisy under occlusion.
// Bound the correction: projected overlap alone must never close wide-open fingers.
export function measuredPinch(
  world: Landmark[] | undefined,
  image: Landmark[],
) {
  const spatial = world ? pinchRatio(world) : Infinity;
  const fallback = pinchRatio(image);
  if (!Number.isFinite(spatial)) return fallback;
  const flat = image.map((p) => ({ ...p, z: 0 }));
  if (palmSize(flat) < palmSize(image) * 0.45) return spatial;
  const projected = pinchRatio(flat);
  return Math.min(spatial, Math.max(projected, spatial * 0.85));
}
function separation(hand: Hand) {
  return hand.pinchRatio ?? pinchRatio(hand.landmarks);
}
interface Track {
  hand: Hand;
  seen: number;
  pressed: boolean;
  changed: number;
  pending: number | null;
  releasing: number | null;
}
export class PinchTouch {
  private tracks: Track[] = [];
  attack = 0;
  reset() {
    this.tracks = [];
  }
  update(hands: Hand[], now: number): Hand | undefined {
    const available = this.tracks.filter((t) => now - t.seen <= 150);
    const next: Track[] = [];
    for (const hand of hands) {
      const signal = separation(hand);
      if (!Number.isFinite(signal) || signal < 0) continue;
      const distance = (t: Track) =>
        Math.hypot(
          palmPoint(hand).x - palmPoint(t.hand).x,
          palmPoint(hand).y - palmPoint(t.hand).y,
        );
      const previous = available.reduce<Track | undefined>(
        (best, t) => (!best || distance(t) < distance(best) ? t : best),
        undefined,
      );
      const track = previous && distance(previous) < 0.3 ? previous : undefined;
      if (track) available.splice(available.indexOf(track), 1);
      const t = track ?? {
        hand,
        seen: now,
        pressed: false,
        changed: 0,
        pending: null,
        releasing: null,
      };
      t.hand = hand;
      t.seen = now;
      // Brief depth spikes from an occluded tip should not chop a held note.
      // A clearly open hand releases immediately; borderline opening needs 45 ms.
      if (signal >= 0.2) {
        t.pending = null;
        t.releasing ??= now;
        if (signal >= 0.3 || now - t.releasing >= 45) t.pressed = false;
      } else {
        t.releasing = null;
        if (!t.pressed && signal <= 0.12) {
          t.pending ??= now;
          if (now - t.pending >= 30) {
            t.pressed = true;
            t.changed = now;
            t.pending = null;
            this.attack++;
          }
        } else if (!t.pressed) t.pending = null;
      }
      next.push(t);
    }
    this.tracks = next;
    // Monophonic instrument: most recently pressed finger takes the note.
    return next
      .filter((t) => t.pressed)
      .sort((a, b) => b.changed - a.changed)[0]?.hand;
  }
}

export function selectOpenPalm(hands: Hand[], previous?: Hand) {
  const palms = hands.filter((h) => hasOpenPalm(h) && separation(h) >= 0.5);
  if (!previous) return palms[0];
  return palms.sort(
    (a, b) =>
      Math.hypot(a.point.x - previous.point.x, a.point.y - previous.point.y) -
      Math.hypot(b.point.x - previous.point.x, b.point.y - previous.point.y),
  )[0];
}
