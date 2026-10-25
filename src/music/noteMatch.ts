import type { Reading } from "../types/theremin";
import { midiFrequency } from "./song";
export type MatchState = { held: number; last: number; release: boolean };
export const emptyMatch: MatchState = { held: 0, last: 0, release: false };
export function matchNote(
  state: MatchState,
  reading: Reading,
  midi: number,
  now: number,
  enabled: boolean,
) {
  const dt = state.last ? Math.max(0, Math.min(150, now - state.last)) : 0;
  const release = state.release && reading.pitch;
  const correct =
    enabled &&
    !release &&
    reading.pitch &&
    reading.volume &&
    reading.gain > 0.002 &&
    Math.abs(1200 * Math.log2(reading.frequency / midiFrequency(midi))) <= 35;
  // A long gap is not evidence that the player held the note.
  const held = correct ? (now - state.last <= 200 ? state.held : 0) + dt : 0;
  return { held, last: now, release, passed: held >= 250 };
}
