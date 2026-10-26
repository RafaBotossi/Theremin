import { expect, it } from "vitest";
import { DepthTouch, selectOpenPalm } from "../src/vision/depthTouch";
import type { Hand } from "../src/types/theremin";
const hand = (x: number, approach = 1): Hand => ({
  point: { x, y: 0.5 },
  landmarks: [],
  label: "",
  score: 0.5,
  approach,
  palmOpen: false,
  indexExtension: 0.5,
});
it("approach presses, holding sustains, retreat releases without bending", () => {
  const touch = new DepthTouch();
  const h = hand(0.2);
  for (let t = 0; t <= 300; t += 30)
    expect(touch.update([h], t)).toBeUndefined();
  h.approach = 1.25;
  for (let t = 330; t <= 510; t += 30) touch.update([h], t);
  expect(touch.update([h], 540)).toBe(h);
  for (let t = 570; t <= 3000; t += 30) expect(touch.update([h], t)).toBe(h);
  h.approach = 1;
  for (let t = 3030; t <= 3210; t += 30) touch.update([h], t);
  expect(touch.update([h], 3240)).toBeUndefined();
});
it("either hand presses and detector order does not swap active tracks", () => {
  const touch = new DepthTouch();
  const a = hand(0.2),
    b = hand(0.8);
  for (let t = 0; t <= 300; t += 30) touch.update([a, b], t);
  a.approach = 1.3;
  for (let t = 330; t <= 510; t += 30) touch.update([b, a], t);
  expect(touch.update([a, b], 540)).toBe(a);
  b.approach = 1.3;
  for (let t = 570; t <= 750; t += 30) touch.update([b, a], t);
  expect(touch.update([a, b], 780)).toBe(b);
  b.palmOpen = true;
  expect(touch.update([b, a], 810)).toBe(a);
  expect(selectOpenPalm([a, b])).toBe(b);
  a.palmOpen = true;
  b.palmOpen = false;
  expect(selectOpenPalm([b, a])).toBe(a);
  expect(touch.update([], 840)).toBeUndefined();
  expect(touch.update([b], 870)).toBeUndefined();
});
it("jitter, missing depth and reacquisition cannot trigger notes", () => {
  const touch = new DepthTouch();
  const h = hand(0.5);
  for (let t = 0; t < 1500; t += 30) {
    h.approach = 1 + (t % 60 ? 0.03 : 0);
    expect(touch.update([h], t)).toBeUndefined();
  }
  h.approach = NaN;
  expect(touch.update([h], 1530)).toBeUndefined();
  h.approach = 2;
  expect(touch.update([h], 1560)).toBeUndefined();
  h.palmOpen = true;
  for (let t = 1590; t <= 2100; t += 30) {
    h.approach! += 0.05;
    expect(touch.update([h], t)).toBeUndefined();
  }
});
