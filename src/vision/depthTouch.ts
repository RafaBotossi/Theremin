import type { Hand } from "../types/theremin";
import { hasOpenPalm } from "./openPalm";

// A monocular camera estimates approach, not absolute distance in centimeters.
// Apparent palm size catches whole-hand motion; relative tip z catches a poke.
export function approachSignal(hand: Hand) {
  if (hand.approach !== undefined) return hand.approach;
  return NaN;
}
interface Track {
  hand: Hand;
  seen: number;
  born: number;
  base: number;
  value: number;
  peak: number;
  pressed: boolean;
  changed: number;
  pending: number | null;
}
export class DepthTouch {
  private tracks: Track[] = [];
  attack = 0;
  reset() {
    this.tracks = [];
  }
  update(hands: Hand[], now: number): Hand | undefined {
    const available = this.tracks.filter((t) => now - t.seen <= 150);
    const next: Track[] = [];
    for (const hand of hands) {
      const signal = approachSignal(hand);
      if (!Number.isFinite(signal) || signal <= 0) continue;
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
        born: now,
        base: signal,
        value: signal,
        peak: signal,
        pressed: false,
        changed: 0,
        pending: null,
      };
      const dt = Math.max(0, now - t.seen);
      t.value += (signal - t.value) * (1 - Math.exp(-dt / 40));
      t.hand = hand;
      t.seen = now;
      if (hasOpenPalm(hand) || now - t.born < 250) {
        t.base = t.value;
        t.peak = t.value;
        t.pressed = false;
        t.pending = null;
      } else {
        if (t.pressed) t.peak = Math.max(t.peak, t.value);
        const wantsChange = t.pressed
          ? t.value < t.base * 1.05 || t.value < t.peak * 0.9
          : t.value > t.base * 1.12;
        if (wantsChange) {
          t.pending ??= now;
          if (now - t.pending >= 45) {
            t.pressed = !t.pressed;
            t.changed = now;
            t.pending = null;
            if (t.pressed) {
              t.peak = t.value;
              this.attack++;
            } else t.base = t.value;
          }
        } else t.pending = null;
        if (!t.pressed && t.value < t.base) t.base = t.value;
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
  const palms = hands.filter(hasOpenPalm);
  if (!previous) return palms[0];
  return palms.sort(
    (a, b) =>
      Math.hypot(a.point.x - previous.point.x, a.point.y - previous.point.y) -
      Math.hypot(b.point.x - previous.point.x, b.point.y - previous.point.y),
  )[0];
}
