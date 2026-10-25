import type { Melody, SongNote } from "./song";

// Solo reduction of the four-page piano PDF supplied by the user.
// Durations are quarter-note beats. null is a rest. Ties are consolidated.
// Introduction: the repeating figure, omitting the simultaneous A4 pedal.
// Later chords: highest note; foreground moving voice takes priority over pads.
type Event = readonly [string | null, number];
export interface ScoreMeasure {
  number: number;
  page: number;
  beats: number;
  events: readonly Event[];
  fermata?: boolean;
}
const ostinato = (beats: number): Event[] =>
  Array.from(
    { length: beats },
    () =>
      [
        ["B3", 0.25],
        ["C4", 0.25],
        ["A3", 0.25],
        ["E3", 0.25],
      ] as Event[],
  ).flat();
const theme = (octave: number): Event[] => [
  [null, 0.5],
  [`D${octave + 1}`, 0.25],
  [`E${octave + 1}`, 0.25],
  [`D${octave + 1}`, 0.25],
  [`A${octave}`, 0.25],
  [`E${octave + 1}`, 0.25],
  [`D${octave + 1}`, 0.25],
  [`A${octave}`, 0.75],
  [`E${octave + 1}`, 0.25],
  [`D${octave + 1}`, 0.5],
  [`A${octave}`, 0.5],
];
const raw: {
  page: number;
  beats: number;
  events: readonly Event[];
  fermata?: boolean;
}[] = [
  // Page 1, measures 1–8. The bar following m1 is 5/4, not 4/4.
  { page: 1, beats: 4, events: ostinato(4) },
  { page: 1, beats: 5, events: ostinato(5) },
  { page: 1, beats: 4, events: ostinato(4) },
  { page: 1, beats: 4, events: ostinato(4) },
  { page: 1, beats: 4, events: ostinato(4) },
  { page: 1, beats: 4, events: ostinato(4) },
  {
    page: 1,
    beats: 6,
    events: [
      ["E4", 1],
      ["D4", 5],
    ],
  },
  {
    page: 1,
    beats: 6,
    events: [
      ["E4", 1],
      ["G4", 1],
      ["B4", 2],
      ["G4", 1],
      ["B4", 1],
    ],
  },
  // Page 2, measures 9–20.
  {
    page: 2,
    beats: 5,
    events: [
      [null, 1],
      ...[
        "A4",
        "A4",
        "B4",
        "A4",
        "C5",
        "A4",
        "D5",
        "A4",
        "A4",
        "A4",
        "B4",
        "A4",
        "C5",
        "A4",
        "D5",
        "A4",
      ].map((n) => [n, 0.25] as Event),
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["E5", 0.5],
      ["D5", 0.25],
      ["C5", 0.25],
      ["A4", 0.5],
      ["E5", 0.5],
      ["D5", 0.75],
      ["A5", 0.75],
      ["E5", 0.5],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["D5", 0.75],
      ["A5", 0.75],
      ["G5", 0.5],
      ["B5", 2],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["A4", 1],
      ["E5", 3],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["G5", 1],
      ["E5", 3],
    ],
  },
  { page: 2, beats: 4, events: theme(4) },
  {
    page: 2,
    beats: 4,
    events: [
      ["A4", 0.75],
      ["B4", 0.25],
      ["A4", 3],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["A4", 1],
      ["E5", 3],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["G5", 1],
      ["E5", 3],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      [null, 0.5],
      ["E5", 0.5],
      ["D5", 0.5],
      ["A4", 0.5],
      ["E5", 0.75],
      ["D5", 0.75],
      ["A4", 0.5],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["A4", 0.75],
      ["B4", 0.25],
      ["A4", 3],
    ],
  },
  {
    page: 2,
    beats: 4,
    events: [
      ["A4", 1],
      ["E5", 3],
    ],
  },
  // Page 3, measures 21–32. m32 returns to 6/4.
  {
    page: 3,
    beats: 4,
    events: [
      ["B5", 1],
      ["G5", 3],
    ],
  },
  {
    page: 3,
    beats: 4,
    events: [
      [null, 0.5],
      ["G5", 0.75],
      ["E5", 0.75],
      ["D5", 0.75],
      ["C5", 0.75],
      ["D5", 0.5],
    ],
  },
  { page: 3, beats: 4, events: [["E5", 4]] },
  {
    page: 3,
    beats: 4,
    events: [
      ["A3", 1],
      ["E4", 3],
    ],
  },
  {
    page: 3,
    beats: 4,
    events: [
      ["G4", 1],
      ["E4", 3],
    ],
  },
  { page: 3, beats: 4, events: theme(3) },
  {
    page: 3,
    beats: 4,
    events: [
      ["A3", 0.75],
      ["B3", 0.25],
      ["A3", 3],
    ],
  },
  { page: 3, beats: 4, events: theme(3) },
  {
    page: 3,
    beats: 4,
    events: [
      [null, 1],
      ["C4", 1],
      ["F4", 1],
      ["A4", 1],
    ],
  },
  {
    page: 3,
    beats: 4,
    events: [
      ["G4", 2],
      ["G4", 1],
      ["C5", 1],
    ],
  },
  {
    page: 3,
    beats: 4,
    events: [
      [null, 1],
      ["G#5", 1],
      ["B5", 1],
      ["D6", 1],
    ],
  },
  {
    page: 3,
    beats: 6,
    events: [
      ["C6", 4],
      ["D6", 2],
    ],
  },
  // Page 4, measures 33–46. Foreground entries replace sustained chord tops.
  {
    page: 4,
    beats: 4,
    events: [
      ["A3", 1],
      ["E4", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["G4", 1],
      ["E4", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["D4", 1],
      ["A4", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["C5", 1],
      ["A4", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["A4", 1],
      ["E5", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["G5", 1],
      ["E5", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["D5", 1],
      ["A5", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["C6", 1],
      ["A5", 3],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["A4", 1],
      ["E5", 1.5],
      ["D5", 0.75],
      ["E5", 0.75],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["G5", 1],
      ["E5", 1.5],
      ["E5", 0.5],
      ["D5", 0.5],
      ["A4", 0.5],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["D5", 1],
      ["A5", 1.5],
      ["A5", 0.5],
      ["E5", 0.5],
      ["D5", 0.5],
    ],
  },
  {
    page: 4,
    beats: 4,
    events: [
      ["C6", 1],
      ["A5", 1],
      ["E5", 0.5],
      ["D5", 0.5],
      ["A5", 1],
    ],
  },
  { page: 4, beats: 4, events: [[null, 4]], fermata: true },
  { page: 4, beats: 4, events: [["E4", 4]], fermata: true },
];
export const ecstasyMeasures: ScoreMeasure[] = raw.map((m, i) => ({
  ...m,
  number: i + 1,
}));
function midi(note: string) {
  const match = /^([A-G])(#?)(\d)$/.exec(note);
  if (!match) throw Error(`Invalid score note: ${note}`);
  return (
    (Number(match[3]) + 1) * 12 +
    { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1] as "C"] +
    (match[2] ? 1 : 0)
  );
}
export function buildEcstasy(
  bpm = 96,
  startMeasure = 1,
  fermataFactor = 2,
): Melody {
  const notes: SongNote[] = [];
  let beat = 0;
  for (const measure of ecstasyMeasures.filter(
    (m) => m.number >= startMeasure,
  )) {
    const length = measure.events.reduce((sum, e) => sum + e[1], 0);
    if (Math.abs(length - measure.beats) > 1e-9)
      throw Error(`Measure ${measure.number} has ${length} beats`);
    for (const [pitch, beats] of measure.events) {
      const held = beats * (measure.fermata ? fermataFactor : 1);
      if (pitch)
        notes.push({
          midi: midi(pitch),
          start: (beat * 60) / bpm,
          duration: (held * 60) / bpm,
          measure: measure.number,
        });
      beat += held;
    }
  }
  return { name: "The Ecstasy of Gold · partitura (solo)", notes };
}
