import { expect, it } from "vitest";
import { openPalm, palmPoint } from "../src/vision/openPalm";
import type { Hand } from "../src/types/theremin";

function palm() {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const base of [5, 9, 13, 17])
    for (let i = 0; i < 4; i++)
      points[base + i] = { x: base / 100, y: -i / 10, z: 0 };
  return points;
}
it("accepts an open palm rotated in 3D, with thumb relaxed", () => {
  const points = palm();
  expect(openPalm(points)).toBe(true);
  expect(openPalm(points.map((p) => ({ x: p.y, y: p.z, z: p.x })))).toBe(true);
});
it("rejects a fist, a pointing hand, missing and invalid landmarks", () => {
  const points = palm();
  for (const base of [9, 13, 17]) points[base + 3] = { ...points[base + 1] };
  expect(openPalm(points)).toBe(false);
  points[8] = { ...points[6] };
  expect(openPalm(points)).toBe(false);
  expect(openPalm([])).toBe(false);
  const invalid = palm();
  invalid[12].x = NaN;
  expect(openPalm(invalid)).toBe(false);
});
it("uses palm position independently of fingertip motion", () => {
  const hand: Hand = {
    point: { x: 1, y: 1 },
    landmarks: palm(),
    score: 1,
    label: "Left",
  };
  const before = palmPoint(hand);
  hand.landmarks[8].y = 10;
  expect(palmPoint(hand)).toEqual(before);
});
