import type { Hand, Point } from "../types/theremin";
import { indexExtension } from "./indexExtension";

export function openPalm(points: (Point & { z?: number })[]) {
  // The thumb may rest naturally; all four long fingers must be extended.
  return [5, 9, 13, 17].every((base) => {
    const finger = points.slice(base, base + 4);
    return (
      finger.length === 4 &&
      indexExtension([...points.slice(0, 5), ...finger]) >= 0.88
    );
  });
}
export function hasOpenPalm(hand: Hand) {
  return hand.palmOpen ?? openPalm(hand.landmarks);
}
export function palmPoint(hand: Hand) {
  const points = [0, 5, 9, 13, 17].map((id) => hand.landmarks[id]);
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return hand.point;
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / 5,
    y: points.reduce((sum, p) => sum + p.y, 0) / 5,
  };
}
