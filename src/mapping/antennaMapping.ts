import type { Hand, Settings } from "../types/theremin";
import { clamp, normalized } from "./gestureMapping";

export function antennaGeometry(s: Settings) {
  return {
    pitchX: s.pitchLeft ? 1 - s.antennaX : s.antennaX,
    volumeX: s.pitchLeft ? 0.76 : 0.24,
    volumeY: s.antennaY,
    direction: s.pitchLeft ? -1 : 1,
  };
}
export function pitchPoint(hand: Hand, s: Settings) {
  if (s.controlMode !== "antennas") return hand.point;
  const a = antennaGeometry(s);
  const tips = [4, 8, 12, 16, 20]
    .map((id) => hand.landmarks[id])
    .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  // Distance to the vertical rod; beyond the rod stays at maximum pitch.
  return tips.reduce(
    (nearest, p) => ((p.x - nearest.x) * a.direction > 0 ? p : nearest),
    tips[0] ?? hand.point,
  );
}
export function pitchDistance(hand: Hand, s: Settings) {
  const a = antennaGeometry(s);
  return Math.max(0, (a.pitchX - pitchPoint(hand, s).x) * a.direction);
}
export function pitchControl(hand: Hand, s: Settings) {
  if (s.controlMode === "screen")
    return normalized(
      hand.point.x,
      s.pitchMin,
      s.pitchMax,
      s.invertPitch,
      s.sensitivity,
    );
  const raw =
    1 -
    (pitchDistance(hand, s) - s.antennaNear) / (s.antennaFar - s.antennaNear);
  const t = clamp((raw - 0.5) * s.sensitivity + 0.5);
  return s.invertPitch ? 1 - t : t;
}
export function volumeControl(hand: Hand, s: Settings) {
  if (s.controlMode === "screen")
    return normalized(
      hand.point.y,
      s.volumeMin,
      s.volumeMax,
      !s.invertVolume,
      s.sensitivity,
    );
  // Vertical distance above the horizontal loop; crossing the loop stays silent.
  const t = clamp((s.antennaY - hand.point.y) / s.volumeReach);
  return s.invertVolume ? 1 - t : t;
}
export function pitchScreenPosition(f: number, s: Settings) {
  const normalized = Math.log(f / s.fMin) / Math.log(s.fMax / s.fMin);
  const directed = s.invertPitch ? 1 - normalized : normalized;
  const raw = (directed - 0.5) / s.sensitivity + 0.5;
  if (s.controlMode === "screen")
    return s.pitchMin + raw * (s.pitchMax - s.pitchMin);
  const a = antennaGeometry(s);
  return (
    a.pitchX -
    a.direction * (s.antennaNear + (1 - raw) * (s.antennaFar - s.antennaNear))
  );
}
export function outsideField(
  pitch: Hand | undefined,
  volume: Hand | undefined,
  s: Settings,
) {
  if (s.controlMode === "screen")
    return !!(
      (pitch && (pitch.point.x < s.pitchMin || pitch.point.x > s.pitchMax)) ||
      (volume && (volume.point.y < s.volumeMin || volume.point.y > s.volumeMax))
    );
  const d = pitch ? pitchDistance(pitch, s) : 0;
  return !!(
    (pitch && (d < s.antennaNear || d > s.antennaFar)) ||
    (volume && volume.point.y < s.antennaY - s.volumeReach)
  );
}
