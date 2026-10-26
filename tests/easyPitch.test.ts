import { expect, it } from "vitest";
import { easyPitch, easyWindow, PinchTarget } from "../src/music/easyPitch";
import { midiFrequency } from "../src/music/song";
import { emptyMatch, matchNote, type MatchState } from "../src/music/noteMatch";
import { emptyReading } from "../src/types/theremin";
it("keeps the Easy target throughout a pinch and changes it only on a fresh attack", () => {
  const latch = new PinchTarget();
  expect(latch.update(60, true, true, 1)).toBe(60);
  for (let i = 0; i < 30; i++) {
    const target = latch.update(62, true, true, 1);
    expect(easyPitch(midiFrequency(61), target)).toBe(midiFrequency(60));
  }
  latch.update(62, true, false, 1);
  expect(latch.update(62, true, true, 2)).toBe(62);
  expect(latch.update(64, true, true, 3)).toBe(64);
  expect(latch.update(65, false, true, 3)).toBe(65);
  expect(latch.update(null, false, true, 3)).toBeNull();
});
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

it("allows two notes before and after the timed target and snaps to the closest", () => {
  const notes = [48, 52, 55, 60, 64, 67, 72].map((midi, i) => ({
    midi,
    start: i,
    duration: 1,
  }));
  const targets = easyWindow(notes, 3.5);
  expect(targets).toEqual([60, 55, 64, 52, 67]);
  for (const midi of targets) {
    expect(easyPitch(midiFrequency(midi + 0.2), targets)).toBeCloseTo(
      midiFrequency(midi),
    );
  }
  // More than two events away: no snapping to these notes, nor beyond 3 semitones.
  expect(easyPitch(midiFrequency(48), targets)).toBe(midiFrequency(48));
  expect(easyPitch(midiFrequency(72), targets)).toBe(midiFrequency(72));
  expect(easyPitch(midiFrequency(62), targets)).toBe(midiFrequency(60));
  expect(easyPitch(450, [])).toBe(450);
  expect(easyWindow(notes, -1)).toEqual([]);
  expect(easyWindow(notes, 7)).toEqual([]);
  expect(easyWindow(notes, 0)).toEqual([48, 52, 55]);
  expect(easyWindow(notes, 6)).toEqual([72, 67, 64]);
});

it("counts repeated notes as score events rather than expanding the window to distinct pitches", () => {
  const notes = [60, 60, 60, 62, 64, 65].map((midi, i) => ({
    midi,
    start: i * 2,
    duration: 1,
  }));
  expect(easyWindow(notes, 0)).toEqual([60, 60, 60]);
  expect(easyWindow(notes, 1.5)).toEqual([60, 60, 60, 62]);
});

it("a new pinch can articulate repeated notes with the other index", () => {
  const reading = {
    ...emptyReading,
    pitch: true,
    volume: true,
    gain: 0.1,
    frequency: 440,
    attack: 2,
  };
  let state: MatchState = {
    ...emptyMatch,
    release: true,
    attack: 1,
    last: 100,
  };
  for (const now of [200, 300]) {
    state = matchNote(state, reading, 69, now, true);
    expect(state.release).toBe(false);
  }
  expect(matchNote(state, reading, 69, 400, true).passed).toBe(true);
  expect(
    matchNote(
      { ...emptyMatch, release: true, attack: 2, last: 100 },
      reading,
      69,
      400,
      true,
    ).passed,
  ).toBe(false);
});
