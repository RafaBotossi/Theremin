import type { Hand } from "../types/theremin";
import { hasOpenPalm } from "./openPalm";

// Normalize fingertip separation by palm length: independent of distance/size.
export function pinchRatio(points: { x: number; y: number; z?: number }[]) {
  if (
    [0, 4, 8, 9].some(
      (i) =>
        !points[i] ||
        ![points[i].x, points[i].y, points[i].z ?? 0].every(Number.isFinite),
    )
  )
    return Infinity;
  const distance = (a: number, b: number) =>
    Math.hypot(
      points[a].x - points[b].x,
      points[a].y - points[b].y,
      (points[a].z ?? 0) - (points[b].z ?? 0),
    );
  const palm = distance(0, 9);
  return palm > 1e-6 ? distance(4, 8) / palm : Infinity;
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
          hand.point.x - t.hand.point.x,
          hand.point.y - t.hand.point.y,
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
      };
      t.hand = hand;
      t.seen = now;
      // Different close/open thresholds prevent chatter near the touch point.
      // Release immediately; audio gain still ramps smoothly in the engine.
      if (signal >= 0.45) {
        t.pressed = false;
        t.pending = null;
      } else if (!t.pressed && signal <= 0.28) {
        t.pending ??= now;
        if (now - t.pending >= 30) {
          t.pressed = true;
          t.changed = now;
          t.pending = null;
          this.attack++;
        }
      } else if (!t.pressed) t.pending = null;
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
  const palms = hands.filter((h) => hasOpenPalm(h) && separation(h) > 0.45);
  if (!previous) return palms[0];
  return palms.sort(
    (a, b) =>
      Math.hypot(a.point.x - previous.point.x, a.point.y - previous.point.y) -
      Math.hypot(b.point.x - previous.point.x, b.point.y - previous.point.y),
  )[0];
}
