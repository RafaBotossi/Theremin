import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseMidi } from "../src/music/midi";
import hobbits from "../src/music/hobbits.json";
it("uses all and only channel 3 notes from the supplied MIDI, preserving relative timing", () => {
  const b = readFileSync("SPECS/scores/concerning-hobbits.mid");
  const track = parseMidi(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  ).find((t) => t.name.endsWith("canal 3"))!;
  expect(track.notes).toHaveLength(83);
  const offset = track.notes[0].start;
  expect(hobbits.notes).toEqual(
    track.notes.map((n) => ({ ...n, start: n.start - offset })),
  );
  expect(hobbits.notes[0].start).toBe(0);
  expect(
    Math.max(...hobbits.notes.map((n) => n.start + n.duration)),
  ).toBeCloseTo(99.904662);
});
