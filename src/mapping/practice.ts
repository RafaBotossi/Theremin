import type { Reading } from "../types/theremin";
export interface PracticeState {
  held: number;
  silence: number;
  ready: boolean;
  last: number;
  advance: boolean;
}
export const initialPractice: PracticeState = {
  held: 0,
  silence: 0,
  ready: false,
  last: 0,
  advance: false,
};
export function practiceStep(
  state: PracticeState,
  r: Reading,
  target: number,
  now: number,
  intervals: boolean,
): PracticeState {
  const dt = state.last
    ? Math.min(0.2, Math.max(0, (now - state.last) / 1000))
    : 0;
  const next = { ...state, last: now, advance: false };
  const present = r.pitch && r.volume;
  if (state.ready && intervals) {
    next.silence = present && r.gain < 0.001 ? state.silence + dt : 0;
    if (next.silence >= 0.25)
      return { ...initialPractice, last: now, advance: true };
    return next;
  }
  const inTune =
    present &&
    r.gain > 0.001 &&
    Math.abs(1200 * Math.log2(r.frequency / target)) <= 25;
  next.held = inTune ? Math.min(2, state.held + dt) : 0;
  next.ready = next.held >= 2;
  return next;
}
