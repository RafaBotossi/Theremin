import { expect, it } from "vitest";
import { SongScore, performanceMessage } from "../src/music/songScore";
import { defaults, emptyReading, loadSettings } from "../src/types/theremin";
import { midiFrequency } from "../src/music/song";
const reading = (midi: number, attack = 1) => ({
  ...emptyReading,
  pitch: true,
  volume: true,
  gain: 0.1,
  frequency: midiFrequency(midi),
  attack,
});
const notes = [60, 62, 64].map((midi, i) => ({ midi, start: i, duration: 1 }));
it("counts one timed hit and each missed note once", () => {
  const s = new SongScore();
  for (let t = 0; t < 2900; t += 100)
    s.timed(
      notes,
      t / 1000,
      t < 1000 ? reading(60) : { ...emptyReading },
      t + 100,
      false,
      1,
    );
  expect(s.finish(3, true)).toMatchObject({ hits: 1, errors: 2, accuracy: 33 });
  expect(s.finish(3, true).errors).toBe(2);
});
it("does not credit a stale reading, muted sound or very brief accidental crossing", () => {
  for (const type of ["stale", "muted", "brief"]) {
    const s = new SongScore(),
      held = reading(60);
    for (let t = 0; t <= 1000; t += 50) {
      const r =
        type === "stale"
          ? held
          : type === "muted"
            ? { ...held, gain: 0 }
            : t < 100
              ? { ...held }
              : { ...emptyReading };
      s.timed(notes, t / 1000, r, t + 100, false, 1);
    }
    expect(s.hits).toBe(0);
  }
});
it("accepts the Easy temporal window and requires a new pinch for repeated notes", () => {
  const s = new SongScore();
  for (let t = 0; t < 400; t += 100)
    s.timed(notes, t / 1000, reading(62), t + 100, true, 1);
  expect(s.hits).toBe(1);
  const repeated = [
    { midi: 60, start: 0, duration: 1 },
    { midi: 60, start: 1, duration: 1 },
  ];
  const r = new SongScore();
  for (let t = 0; t < 1600; t += 100)
    r.timed(repeated, t / 1000, reading(60), t + 100, false, 1);
  expect(r.hits).toBe(1);
  for (let t = 1600; t < 2000; t += 100)
    r.timed(repeated, t / 1000, reading(60, 2), t + 100, false, 1);
  expect(r.finish(2, true)).toMatchObject({ hits: 2, errors: 0 });
});
it("counts sustained wrong attempts once per pinch and scores the correction", () => {
  const s = new SongScore();
  for (let t = 100; t < 2000; t += 100)
    s.practice(reading(67), 0, 60, false, true, t);
  expect(s.errors).toBe(1);
  for (let t = 2000; t < 2500; t += 100)
    s.practice(reading(67, 2), 0, 60, false, true, t);
  expect(s.errors).toBe(2);
  s.practice(reading(60, 3), 0, 60, true, true, 2600);
  s.practice(reading(60, 3), 0, 60, true, true, 2700);
  expect(s.finish(1, false)).toMatchObject({ hits: 1, errors: 2 });
});
it("does not punish a held previous pinch or silence in step practice", () => {
  const s = new SongScore();
  for (let t = 100; t < 2000; t += 100)
    s.practice(reading(60), 1, 62, false, false, t);
  for (let t = 2000; t < 4000; t += 100)
    s.practice({ ...emptyReading }, 1, 62, false, true, t);
  expect(s.errors).toBe(0);
  expect(performanceMessage(10, 0).message).toMatch(/Excelente/);
  expect(performanceMessage(0, 10).message).toMatch(/precisa praticar/);
});
it("enables the background by default and migrates once, preserving a later opt-out", () => {
  localStorage.clear();
  expect(loadSettings().musicalBackground).toBe(true);
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ musicalBackground: false }),
  );
  expect(loadSettings().musicalBackground).toBe(true);
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ ...defaults, musicalBackground: false }),
  );
  expect(loadSettings().musicalBackground).toBe(false);
  localStorage.clear();
});
