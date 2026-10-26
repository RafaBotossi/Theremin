import { expect, it } from "vitest";
import { easyPitch } from "../src/music/easyPitch";
import { midiFrequency } from "../src/music/song";
import { emptyMatch, matchNote } from "../src/music/noteMatch";
import { emptyReading } from "../src/types/theremin";
it("corrects up to three semitones on either side of the target, without changing distant notes", () => {
  for (const target of [48, 69, 84]) {
    for (const offset of [-3, -2, -1, -0.8, 0, 0.8, 1, 2, 3])
      expect(easyPitch(midiFrequency(target + offset), target)).toBeCloseTo(
        midiFrequency(target),
      );
    for (const offset of [-12, -3.01, 3.01, 12])
      expect(easyPitch(midiFrequency(target + offset), target)).toBe(
        midiFrequency(target + offset),
      );
  }
  expect(easyPitch(450, null)).toBe(450);
});
it("counts a corrected note only after the normal hold time and never while silent", () => {
  const raw = midiFrequency(72);
  const reading = {
    ...emptyReading,
    pitch: true,
    volume: true,
    gain: 0.1,
    frequency: easyPitch(raw, 69),
  };
  let state = { ...emptyMatch };
  for (const now of [100, 200, 300]) {
    state = matchNote(state, reading, 69, now, true);
    expect(state).toHaveProperty("passed", false);
  }
  expect(matchNote(state, reading, 69, 400, true).passed).toBe(true);
  expect(
    matchNote(state, { ...reading, frequency: raw }, 69, 400, true).passed,
  ).toBe(false);
  expect(matchNote(state, { ...reading, gain: 0 }, 69, 400, true).passed).toBe(
    false,
  );
});
