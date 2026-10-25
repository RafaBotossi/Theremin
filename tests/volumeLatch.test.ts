import { afterEach, expect, it } from "vitest";
import { VolumeLatch, loadVolume } from "../src/mapping/volumeLatch";
afterEach(() => localStorage.clear());
it("locks a settled volume despite lowering the open hand or jitter", () => {
  const latch = new VolumeLatch();
  latch.update(1, 0);
  expect(latch.update(1, 100)).toBe(0);
  expect(latch.update(1, 250)).toBe(1);
  latch.update(0.99, 900);
  expect(latch.locked).toBe(true);
  for (let t = 1000; t < 100000; t += 100) expect(latch.update(0.1, t)).toBe(1);
  latch.update(null, 100100);
  expect(latch.update(0.1, 100200)).toBe(1);
});
it("holds while absent, re-arms only after deliberate release and persists", () => {
  const latch = new VolumeLatch(1);
  latch.update(1, 0);
  latch.update(1, 900);
  latch.update(null, 1000);
  latch.update(null, 1500);
  expect(latch.value).toBe(1);
  expect(latch.update(0.4, 2000)).toBe(1);
  expect(latch.update(0.4, 2300)).toBe(0.4);
  latch.save();
  expect(loadVolume()).toBe(0.4);
  expect(new VolumeLatch(loadVolume()).value).toBe(0.4);
  localStorage.setItem("air-theremin-volume", "NaN");
  expect(loadVolume()).toBe(0);
});
