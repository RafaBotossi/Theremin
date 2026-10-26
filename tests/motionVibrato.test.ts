import { expect, it } from "vitest";
import { MotionVibrato } from "../src/vision/motionVibrato";
import { defaults, loadSettings } from "../src/types/theremin";

it("enables the default depth for a new player and respects an explicit zero", () => {
  localStorage.removeItem("air-theremin-settings");
  expect(loadSettings().vibrato).toBe(defaults.vibrato);
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ ...defaults, vibrato: 0 }),
  );
  expect(loadSettings().vibrato).toBe(0);
  localStorage.removeItem("air-theremin-settings");
});

it.each([15, 24, 30, 60])(
  "detects deliberate tremor at %s camera FPS and fades at rest",
  (fps) => {
    const motion = new MotionVibrato();
    let amount = 0;
    for (let time = 0; time < 1500; time += 1000 / fps)
      amount = motion.update(
        6900 + 22 * Math.sin((time / 1000) * 2 * Math.PI * 5.5),
        time,
        1,
      );
    expect(amount).toBeGreaterThan(0.65);
    for (let time = 1500; time < 2300; time += 1000 / fps)
      amount = motion.update(6900, time, 1);
    expect(amount).toBeLessThan(0.02);
  },
);
it("ignores tracker noise, glissandos, a single correction and wide note changes", () => {
  for (const movement of [
    (t: number) => 6900 + 2 * Math.sin(t),
    (t: number) => 6900 + t * 0.4,
    (t: number) => 6900 + 20 * Math.sin(t / 1000),
    (t: number) => 6900 + 150 * Math.sin((t / 1000) * 2 * Math.PI * 5.5),
  ]) {
    const motion = new MotionVibrato();
    for (let time = 0; time < 2000; time += 33)
      expect(motion.update(movement(time), time, 1)).toBe(0);
  }
});
it("resets on release, lost tracking and a new pinch", () => {
  for (const reset of ["release", "gap", "attack"]) {
    const motion = new MotionVibrato();
    for (let t = 0; t < 1200; t += 33)
      motion.update(6900 + 22 * Math.sin((t / 1000) * 2 * Math.PI * 5.5), t, 1);
    if (reset === "release") expect(motion.update(null, 1200, 1)).toBe(0);
    expect(
      motion.update(
        6900,
        reset === "gap" ? 1600 : 1233,
        reset === "attack" ? 2 : 1,
      ),
    ).toBe(0);
  }
});
