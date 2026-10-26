import { expect, it } from "vitest";
import {
  PinchTouch,
  pinchRatio,
  selectOpenPalm,
} from "../src/vision/pinchTouch";
import type { Hand } from "../src/types/theremin";
const hand = (x: number, ratio = 0.8): Hand => ({
  point: { x, y: 0.5 },
  landmarks: [],
  label: "",
  score: 0.5,
  pinchRatio: ratio,
  palmOpen: false,
});
it("closing plays, holding sustains, opening releases with hysteresis", () => {
  const touch = new PinchTouch(),
    h = hand(0.2);
  expect(touch.update([h], 0)).toBeUndefined();
  h.pinchRatio = 0.1;
  expect(touch.update([h], 30)).toBeUndefined();
  expect(touch.update([h], 60)).toBe(h);
  expect(touch.attack).toBe(1);
  for (let now = 90; now < 3000; now += 30) {
    h.pinchRatio = now % 60 ? 0.3 : 0.2;
    expect(touch.update([h], now)).toBe(h);
  }
  h.pinchRatio = 0.5;
  expect(touch.update([h], 3000)).toBeUndefined();
  h.pinchRatio = 0.35;
  expect(touch.update([h], 3030)).toBeUndefined();
  h.pinchRatio = 0;
  touch.update([h], 3060);
  expect(touch.update([h], 3090)).toBe(h);
  expect(touch.attack).toBe(2);
});
it("either hand can pinch and the most recent pinch wins", () => {
  const touch = new PinchTouch(),
    a = hand(0.2, 0.1),
    b = hand(0.8);
  touch.update([a, b], 0);
  expect(touch.update([b, a], 30)).toBe(a);
  b.pinchRatio = 0.1;
  touch.update([a, b], 60);
  expect(touch.update([b, a], 90)).toBe(b);
  b.pinchRatio = 0.8;
  expect(touch.update([a, b], 120)).toBe(a);
  expect(touch.update([], 150)).toBeUndefined();
  expect(touch.update([a], 180)).toBeUndefined();
});
it("pinching excludes volume even with the remaining fingers extended", () => {
  const h = hand(0.2, 0.1);
  h.palmOpen = true;
  expect(selectOpenPalm([h])).toBeUndefined();
  const touch = new PinchTouch();
  touch.update([h], 0);
  expect(touch.update([h], 30)).toBe(h);
  h.pinchRatio = 0.8;
  expect(selectOpenPalm([h])).toBe(h);
  expect(touch.update([h], 60)).toBeUndefined();
});
it("invalid landmarks stay silent and the metric is invariant under scale and rotation", () => {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  points[9] = { x: 0, y: 1, z: 0 };
  points[4] = { x: 0, y: 2, z: 0 };
  points[8] = { x: 0.1, y: 2, z: 0.1 };
  expect(pinchRatio(points)).toBeCloseTo(Math.sqrt(0.02));
  expect(
    pinchRatio(
      points.map((p) => ({ x: 5 + p.z * 3, y: 2 + p.x * 3, z: 9 + p.y * 3 })),
    ),
  ).toBeCloseTo(pinchRatio(points));
  expect(pinchRatio([])).toBe(Infinity);
  const touch = new PinchTouch(),
    h = hand(0.2, NaN);
  expect(touch.update([h], 0)).toBeUndefined();
  expect(touch.update([h], 100)).toBeUndefined();
});
