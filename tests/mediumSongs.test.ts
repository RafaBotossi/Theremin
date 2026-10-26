import { expect, it } from "vitest";
import { mediumSongs } from "../src/music/mediumSongs";
import { isPolyphonic } from "../src/music/song";
it.each([
  ["greensleeves", 33, 97, 84],
  ["silent-night", 23, 69, 66],
  ["brahms-lullaby", 17, 48, 72],
  ["minuet-g", 32, 96, 72],
  ["ave-maria", 12, 48, 60],
  ["fur-elise", 9, 24, 60],
  ["new-world-largo", 12, 48, 48],
])("validates solo score and rhythm for %s", (id, bars, beats, bpm) => {
  const notes = mediumSongs.find((song) => song.id === id)!.melody.notes;
  expect(isPolyphonic(notes)).toBe(false);
  expect(notes.at(-1)!.measure).toBe(bars);
  expect(notes.at(-1)!.start + notes.at(-1)!.duration).toBeCloseTo(
    (beats * 60) / bpm,
    5,
  );
  for (let measure = 2; measure < bars; measure++) {
    // A bar starts at its written position; rests may delay the first note.
    const current = notes.filter((n) => n.measure === measure);
    expect(current.length).toBeGreaterThan(0);
    expect(
      current.every((n) => n.duration > 0 && Number.isFinite(n.midi)),
    ).toBe(true);
  }
});
