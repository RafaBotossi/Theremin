import { expect, it } from "vitest";
import { buildEcstasy, ecstasyMeasures } from "../src/music/ecstasyScore";
import { frameAt, isPolyphonic } from "../src/music/song";
it("cobre 46 compassos, incluindo as mudanças de métrica do PDF", () => {
  expect(ecstasyMeasures).toHaveLength(46);
  expect(
    ecstasyMeasures
      .filter((m) => m.beats !== 4)
      .map((m) => [m.number, m.beats]),
  ).toEqual([
    [2, 5],
    [7, 6],
    [8, 6],
    [9, 5],
    [32, 6],
  ]);
  for (const m of ecstasyMeasures)
    expect(m.events.reduce((sum, n) => sum + n[1], 0)).toBe(m.beats);
  const score = buildEcstasy();
  expect(isPolyphonic(score.notes)).toBe(false);
  expect(score.notes.at(-1)!.start + score.notes.at(-1)!.duration).toBe(125);
});
it("preserva ligadura longa, pausas e entrada do tema principal", () => {
  const { notes } = buildEcstasy();
  expect(notes.find((n) => n.measure === 7 && n.midi === 62)?.duration).toBe(
    3.125,
  );
  const theme = notes.find((n) => n.measure === 12)!;
  expect(theme).toMatchObject({ midi: 69, start: 31.25, duration: 0.625 });
  expect(frameAt(notes, 23.25).current).toBeNull(); // quarter rest at m9
  expect(frameAt(notes, 116).current).toBeNull(); // G.P. with fermata at m45
});
it("BPM e fermatas mudam o tempo, sem mudar notas ou criar notas durante pausas", () => {
  const slow = buildEcstasy(48),
    normal = buildEcstasy(96);
  expect(slow.notes.at(-1)!.start).toBe(normal.notes.at(-1)!.start * 2);
  expect(buildEcstasy(96, 1, 1).notes.at(-1)!.duration).toBe(2.5);
  const excerpt = buildEcstasy(96, 12);
  expect(excerpt.notes[0]).toMatchObject({ midi: 69, start: 0, measure: 12 });
  expect(excerpt.notes.map((n) => n.midi)).toEqual(
    normal.notes.filter((n) => n.measure! >= 12).map((n) => n.midi),
  );
});
