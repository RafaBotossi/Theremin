export interface SongNote {
  measure?: number;
  midi: number;
  start: number;
  duration: number;
}
export interface Melody {
  name: string;
  notes: SongNote[];
}
export interface SongGuide {
  listening: boolean;
  attack: number | null;
  active: boolean;
  current: number | null;
  next: number | null;
  cue: string;
  remaining: number | null;
  falling?: { midi: number; start: number; progress: number }[];
  timed?: boolean;
}
// Countdown remains three real seconds; any time crossing zero uses song speed.
export function advanceSongTime(time: number, delta: number, speed: number) {
  if (speed <= 0) return time;
  if (time < 0) return time + delta < 0 ? time + delta : (time + delta) * speed;
  return time + delta * speed;
}
export function guideSongTime(time: number, speed: number) {
  return time < 0 ? time * speed : time;
}
// Positions follow the song clock, so pause, speed and looping stay in sync.
export function risingNotes(notes: SongNote[], time: number, horizon = 4) {
  return notes
    .filter((n) => n.start > time && n.start <= time + horizon)
    .map((n) => ({
      midi: n.midi,
      start: n.start,
      progress: (n.start - time) / horizon,
    }));
}
export const emptyGuide: SongGuide = {
  listening: false,
  attack: null,
  active: false,
  current: null,
  next: null,
  cue: "",
  remaining: 0,
};
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function frameAt(notes: SongNote[], time: number) {
  let lo = 0,
    hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].start <= time) lo = mid + 1;
    else hi = mid;
  }
  const previous = notes[lo - 1];
  const current =
    previous && time < previous.start + previous.duration ? previous : null;
  const next = notes[lo] ?? null;
  return {
    current,
    next,
    remaining: Math.max(
      0,
      current
        ? current.start + current.duration - time
        : next
          ? next.start - time
          : 0,
    ),
  };
}
export const demoMelody: Melody = {
  name: "Exercício original · demonstração",
  notes: [60, 62, 64, 67, 69, 67, 64, 60].map((midi, i) => ({
    midi,
    start: i * 1.25,
    duration: 1,
  })),
};
export function isPolyphonic(notes: SongNote[]) {
  return notes.some(
    (n, i) =>
      i > 0 && notes[i - 1].start + notes[i - 1].duration > n.start + 0.03,
  );
}
