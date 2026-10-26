import { expect, it } from "vitest";
import { mediumSongs } from "../src/music/mediumSongs";
import { frameAt, isPolyphonic } from "../src/music/song";
it.each([
  ["greensleeves", 33, 97, 84],
  ["silent-night", 23, 69, 66],
  ["brahms-lullaby", 17, 48, 72],
  ["minuet-g", 32, 96, 72],
  ["ave-maria", 12, 48, 60],
  ["fur-elise", 9, 24, 60],
  ["new-world-largo", 12, 48, 48],
  ["moonlight", 27, 108, 44],
  ["gymnopedie-1", 35, 105, 40],
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
    // Tied notes may span a whole bar without a new attack.
    if (id !== "gymnopedie-1") expect(current.length).toBeGreaterThan(0);
    expect(
      current.every((n) => n.duration > 0 && Number.isFinite(n.midi)),
    ).toBe(true);
  }
});

it("keeps sustained Gymnopedie ties and enters the later phrases at their score positions", () => {
  const notes = mediumSongs.find((s) => s.id === "gymnopedie-1")!.melody.notes;
  const held = notes.find((n) => n.measure === 5)!;
  expect(held).toMatchObject({ midi: 66, start: 18, duration: 18 });
  expect(notes.some((n) => [6, 7, 8].includes(n.measure!))).toBe(false);
  expect(frameAt(notes, 35).current).toBe(held);
  expect(notes.find((n) => n.measure === 9)).toMatchObject({
    midi: 78,
    start: 37.5,
  });
  expect(notes.at(-1)).toMatchObject({ midi: 74, start: 153, duration: 4.5 });
});

it("extends Moonlight beyond the opening with the next theme and its pauses", () => {
  const notes = mediumSongs.find((s) => s.id === "moonlight")!.melody.notes;
  expect(notes.find((n) => n.measure === 10)?.midi).toBe(67);
  expect(notes.find((n) => n.measure === 10)?.start).toBeCloseTo(
    (39 * 60) / 44,
  );
  expect(frameAt(notes, (38 * 60) / 44).current).toBeNull();
  expect(notes.filter((n) => n.measure === 27).map((n) => n.midi)).toEqual([
    76, 75, 73,
  ]);
});
