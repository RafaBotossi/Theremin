import { expect, it } from "vitest";
import { beginnerSongs } from "../src/music/beginnerSongs";
import { frameAt, isPolyphonic } from "../src/music/song";

it.each([
  ["ode-joy", 64, 16, 64],
  ["little-star", 48, 24, 60],
  ["amazing-grace", 60, 17, 55],
  ["frere-jacques", 32, 8, 60],
  ["mary-lamb", 32, 8, 64],
  ["hot-cross-buns", 16, 4, 64],
  ["london-bridge", 32, 8, 67],
  ["row-your-boat", 24, 4, 60],
])(
  "preserves the complete solo timeline for %s",
  (id, duration, bars, first) => {
    const { notes } = beginnerSongs.find((song) => song.id === id)!.melody;
    expect(notes[0]).toMatchObject({ midi: first, start: 0, measure: 1 });
    expect(notes.at(-1)!.measure).toBe(bars);
    expect(notes.at(-1)!.start + notes.at(-1)!.duration).toBeCloseTo(duration);
    expect(isPolyphonic(notes)).toBe(false);
    for (const [i, note] of notes.entries()) {
      expect(note.duration).toBeGreaterThan(0);
      expect(note.midi).toBeGreaterThanOrEqual(55);
      expect(note.midi).toBeLessThanOrEqual(72);
      if (i)
        expect(note.start).toBeCloseTo(
          notes[i - 1].start + notes[i - 1].duration,
        );
      expect(frameAt(notes, note.start + note.duration / 2).current).toBe(note);
    }
    expect(frameAt(notes, duration + 0.01).current).toBeNull();
  },
);
