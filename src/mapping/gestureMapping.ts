import type { Hand, Settings } from "../types/theremin";
import { hasOpenPalm } from "../vision/openPalm";
import { selectOpenPalm } from "../vision/depthTouch";
export const clamp = (n: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n));
export function normalized(
  n: number,
  min: number,
  max: number,
  invert = false,
  sensitivity = 1,
) {
  const t = clamp(((n - min) / (max - min) - 0.5) * sensitivity + 0.5);
  return invert ? 1 - t : t;
}
export function frequencyAt(t: number, min: number, max: number) {
  return min * (max / min) ** clamp(t);
}
export function quantize(f: number, scale: Settings["scale"]) {
  if (scale === "free") return f;
  const midi = 69 + 12 * Math.log2(f / 440);
  if (scale === "assisted") {
    const distance = Math.round(midi) - midi;
    // Continuous attraction, strongest near a note and zero at the boundary.
    const assisted = midi + 0.9 * distance * Math.cos(Math.PI * distance) ** 2;
    return 440 * 2 ** ((assisted - 69) / 12);
  }
  let note = Math.round(midi);
  if (scale === "pentatonic") {
    let best = Infinity;
    for (let n = Math.floor(midi) - 6; n <= Math.ceil(midi) + 6; n++) {
      if (
        [0, 2, 4, 7, 9].includes(((n % 12) + 12) % 12) &&
        Math.abs(n - midi) < best
      ) {
        best = Math.abs(n - midi);
        note = n;
      }
    }
  }
  return 440 * 2 ** ((note - 69) / 12);
}
export function noteName(f: number) {
  const m = Math.round(69 + 12 * Math.log2(f / 440));
  return (
    [
      "Dó",
      "Dó♯",
      "Ré",
      "Ré♯",
      "Mi",
      "Fá",
      "Fá♯",
      "Sol",
      "Sol♯",
      "Lá",
      "Lá♯",
      "Si",
    ][((m % 12) + 12) % 12] +
    (Math.floor(m / 12) - 1)
  );
}
export function selectHands(hands: Hand[], s: Settings, previous?: Hand) {
  // score is handedness certainty, NOT confidence that a hand exists.
  // Detection/presence confidence is already enforced by HandLandmarker.
  const valid = hands.filter(
    (h) => Number.isFinite(h.point.x) && Number.isFinite(h.point.y),
  );
  if (s.controlMode === "wand") {
    const candidates = valid.filter((h) => !hasOpenPalm(h));
    if (previous)
      candidates.sort(
        (a, b) =>
          Math.hypot(
            a.point.x - previous.point.x,
            a.point.y - previous.point.y,
          ) -
          Math.hypot(
            b.point.x - previous.point.x,
            b.point.y - previous.point.y,
          ),
      );
    return { pitch: candidates[0], volume: selectOpenPalm(valid) };
  }
  const anatomical =
    s.assignment === "anatomical" &&
    valid.every((h) => h.score >= 0.6 && ["Left", "Right"].includes(h.label)) &&
    new Set(valid.map((h) => h.label)).size === valid.length;
  // Ambiguous handedness falls back to screen zones. A lone hand never
  // fills both roles, and two hands in the same zone do not enable sound.
  const right = anatomical
    ? valid.find((h) => h.label === "Left")
    : valid.find((h) => h.point.x >= 0.5);
  const left = anatomical
    ? valid.find((h) => h.label === "Right")
    : valid.find((h) => h.point.x < 0.5);
  // MediaPipe sees unmirrored camera input; its selfie handedness is reversed.
  const roles = s.pitchLeft
    ? { pitch: left, volume: right }
    : { pitch: right, volume: left };
  return roles;
}
export class TrackingGate {
  private lastPitch = -Infinity;
  private lastFrame = -Infinity;
  update(now: number, pitch: boolean, volume: boolean) {
    this.lastFrame = now;
    if (pitch) this.lastPitch = now;
    return volume && now - this.lastPitch <= 150;
  }
  fresh(now: number) {
    return now - this.lastFrame <= 150 && now - this.lastPitch <= 150;
  }
  remaining(now: number) {
    return Math.max(
      0,
      Math.min(150 - (now - this.lastFrame), 150 - (now - this.lastPitch)),
    );
  }
  reset() {
    this.lastPitch = -Infinity;
    this.lastFrame = -Infinity;
  }
}
