import { expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { risingNotes, frameAt } from "../src/music/song";
import { NoteGuide } from "../src/components/NoteGuide";
import { defaults } from "../src/types/theremin";

const notes = [
  { midi: 69, start: 0, duration: 1 },
  { midi: 72, start: 2, duration: 2 },
];
it("moves upward on the song clock and becomes the current note at the hit line", () => {
  expect(risingNotes(notes, -3)[0].progress).toBe(0.75);
  expect(risingNotes(notes, -1)[0].progress).toBe(0.25);
  expect(risingNotes(notes, -0.001)[0].progress).toBeCloseTo(0);
  expect(frameAt(notes, 0).current?.midi).toBe(69);
  expect(risingNotes(notes, 0).map((n) => n.midi)).toEqual([72]);
  expect(frameAt(notes, 1.5).current).toBeNull();
  expect(risingNotes(notes, 4)).toEqual([]);
});
it("keeps played pitch highlighted alongside target and labels the lanes", () => {
  const { container, rerender } = render(
    <NoteGuide
      settings={defaults}
      frequency={440}
      active
      target={72}
      timed
      falling={risingNotes(notes, -1)}
    />,
  );
  expect(container.querySelector(".note-line.selected span")?.textContent).toBe(
    "Lá4",
  );
  expect(container.querySelectorAll(".song-rising")).toHaveLength(2);
  expect(container.querySelector(".song-hit-line")).not.toBeNull();
  expect(
    [...container.querySelectorAll(".note-line span")].every(
      (el) => el.textContent,
    ),
  ).toBe(true);
  rerender(
    <NoteGuide settings={defaults} frequency={440} active target={72} />,
  );
  expect(container.querySelectorAll(".song-rising")).toHaveLength(0);
  expect(container.querySelector(".song-target")).not.toBeNull();
  cleanup();
});
