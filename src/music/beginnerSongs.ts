import type { Melody } from "./song";

// Each pair is [MIDI pitch, beats]. Bars are explicit to retain score positions.
// These are solo study adaptations; source files and editorial choices are in
// SPECS/scores/SOURCES.txt. No recordings or runtime downloads are used.
type Bar = [number, number][];
function melody(name: string, bpm: number, bars: Bar[]): Melody {
  let beat = 0;
  return {
    name,
    notes: bars.flatMap((bar, index) =>
      bar.map(([midi, length]) => {
        const note = {
          midi,
          start: (beat * 60) / bpm,
          duration: (length * 60) / bpm,
          measure: index + 1,
        };
        beat += length;
        return note;
      }),
    ),
  };
}
const quarters = (...notes: number[]): Bar => notes.map((n) => [n, 1]);
const odeOpening: Bar[] = [
  quarters(64, 64, 65, 67),
  quarters(67, 65, 64, 62),
  quarters(60, 60, 62, 64),
];
const odeEnding: Bar = [
  [62, 1.5],
  [60, 0.5],
  [60, 2],
];
const starOpening: Bar[] = [
  quarters(60, 60),
  quarters(67, 67),
  quarters(69, 69),
  [[67, 2]],
  quarters(65, 65),
  quarters(64, 64),
  quarters(62, 62),
  [[60, 2]],
];
// Amazing Grace: ornament-free melody, Eb -> C; compound meter retained.
// Beat = dotted quarter (three eighths). First and last bars are incomplete.
const graceRun: Bar = [
  [64, 0.5],
  [62, 1 / 6],
  [60, 1 / 3],
];

export const beginnerSongs = [
  {
    id: "ode-joy",
    label: "Ode à Alegria · fácil",
    melody: melody("Ode à Alegria", 60, [
      ...odeOpening,
      [
        [64, 1.5],
        [62, 0.5],
        [62, 2],
      ],
      ...odeOpening,
      odeEnding,
      quarters(62, 62, 64, 60),
      [
        [62, 1],
        [64, 0.5],
        [65, 0.5],
        [64, 1],
        [60, 1],
      ],
      [
        [62, 1],
        [64, 0.5],
        [65, 0.5],
        [64, 1],
        [62, 1],
      ],
      [
        [60, 1],
        [62, 1],
        [55, 2],
      ],
      ...odeOpening,
      odeEnding,
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528",
    credit:
      "Beethoven · edição Peter Chubb · domínio público. Solo em Dó, 60 BPM.",
  },
  {
    id: "little-star",
    label: "Brilha, Brilha, Estrelinha · fácil",
    melody: melody("Brilha, Brilha, Estrelinha", 60, [
      ...starOpening,
      quarters(67, 67),
      quarters(65, 65),
      quarters(64, 64),
      [[62, 2]],
      quarters(67, 67),
      quarters(65, 65),
      quarters(64, 64),
      [[62, 2]],
      ...starOpening,
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2236",
    credit:
      "Tema tradicional / Mozart · edição J. J. Olson · domínio público. Melodia simplificada em Dó, 60 BPM.",
  },
  {
    id: "amazing-grace",
    label: "Amazing Grace · próximo passo",
    melody: melody("Amazing Grace", 48, [
      [
        [55, 2 / 3],
        [60, 1 / 3],
      ],
      [[60, 2], ...graceRun],
      [
        [64, 2],
        [64, 2 / 3],
        [62, 1 / 3],
      ],
      [
        [60, 2],
        [57, 1],
      ],
      [
        [55, 2],
        [55, 2 / 3],
        [60, 1 / 3],
      ],
      [[60, 2], ...graceRun],
      [
        [64, 2],
        [62, 2 / 3],
        [64, 1 / 3],
      ],
      [
        [67, 2],
        [67, 1],
      ],
      [
        [67, 2],
        [64, 2 / 3],
        [67, 1 / 3],
      ],
      [[67, 2], ...graceRun],
      [
        [64, 2],
        [64, 2 / 3],
        [62, 1 / 3],
      ],
      [
        [60, 2],
        [57, 1],
      ],
      [
        [55, 2],
        [55, 2 / 3],
        [60, 1 / 3],
      ],
      [[60, 2], ...graceRun],
      [
        [64, 2],
        [62, 1],
      ],
      [
        [60, 2],
        [60, 1],
      ],
      [[60, 2]],
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1832",
    credit:
      "Tradicional · arr. Breizh Partitions, © 2012. Adaptação: sem ornamentos, em Dó, 48 BPM (semínima pontuada).",
    license: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
];
