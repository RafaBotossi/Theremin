import { expect, it } from "vitest";
import {
  PinchTouch,
  pinchRatio,
  measuredPinch,
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
  expect(touch.update([h], 3000)).toBe(h);
  expect(touch.update([h], 3050)).toBeUndefined();
  h.pinchRatio = 0.35;
  expect(touch.update([h], 3080)).toBeUndefined();
  h.pinchRatio = 0;
  touch.update([h], 3110);
  expect(touch.update([h], 3140)).toBe(h);
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

function fixture() {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  points[5] = { x: -0.3, y: 0.95, z: 0 };
  points[9] = { x: 0, y: 1, z: 0 };
  points[13] = { x: 0.25, y: 1, z: 0 };
  points[17] = { x: 0.5, y: 0.85, z: 0 };
  points[8] = { x: 0, y: 1.8, z: 0 };
  points[7] = { x: 0.9, y: 1.8, z: 0 };
  points[4] = { x: 0.4, y: 1.8, z: 0 };
  points[3] = { x: 0.4, y: 1.3, z: 0 };
  return points;
}
it("recognizes lateral pad contact under rotation, distance and palm landmark noise", () => {
  const p = fixture();
  // Tips are 40% of a palm apart, but the finger pads are touching.
  expect(pinchRatio(p)).toBeLessThan(0.15);
  for (const angle of [0, 0.5, 1.2, 1.57, 2.5])
    for (const scale of [0.02, 0.08, 2]) {
      const rotated = p.map((v) => ({
        x: scale * (v.x * Math.cos(angle) + v.z * Math.sin(angle)) + 3,
        y: v.y * scale - 1,
        z: scale * (-v.x * Math.sin(angle) + v.z * Math.cos(angle)),
      }));
      expect(pinchRatio(rotated)).toBeCloseTo(pinchRatio(p));
    }
  p[9] = { x: 0, y: 0.01, z: 0 };
  expect(pinchRatio(p)).toBeLessThan(0.15);
});
it("uses image evidence for noisy depth but rejects projected overlap of distant fingertips", () => {
  const image = fixture();
  image[4] = { x: 0.08, y: 1.8, z: 0 };
  const world = image.map((p) => ({ ...p }));
  world[4].z = 0.45;
  expect(pinchRatio(world)).toBeGreaterThan(0.32);
  expect(measuredPinch(world, image)).toBeLessThan(0.32);
  world[4].z = 1.2;
  expect(measuredPinch(world, image)).toBeGreaterThan(0.5);
  expect(measuredPinch([], image)).toBeCloseTo(pinchRatio(image));
});
it("one depth spike does not retrigger, but opening or lost tracking still stops", () => {
  const touch = new PinchTouch(),
    h = hand(0.2, 0.1);
  touch.update([h], 0);
  touch.update([h], 33);
  h.pinchRatio = 0.6;
  expect(touch.update([h], 66)).toBe(h);
  h.pinchRatio = 0.2;
  expect(touch.update([h], 99)).toBe(h);
  expect(touch.attack).toBe(1);
  h.pinchRatio = 0.9;
  expect(touch.update([h], 132)).toBeUndefined();
  h.pinchRatio = 0.1;
  touch.update([h], 165);
  touch.update([h], 198);
  expect(touch.update([], 231)).toBeUndefined();
});
