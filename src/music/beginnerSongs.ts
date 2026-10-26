import type { Melody } from "./song";

// Each pair is [MIDI pitch, beats]. Bars are explicit to retain score positions.
// These are solo study adaptations; source files and editorial choices are in
// SPECS/scores/SOURCES.txt. No recordings or runtime downloads are used.
type Bar = [number | null, number][];
export function melody(name: string, bpm: number, bars: Bar[]): Melody {
  let beat = 0;
  return {
    name,
    notes: bars.flatMap((bar, index) =>
      bar.flatMap(([midi, length]) => {
        const note = {
          midi,
          start: (beat * 60) / bpm,
          duration: (length * 60) / bpm,
          measure: index + 1,
        };
        beat += length;
        return midi === null ? [] : [{ ...note, midi }];
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

export interface StudySong {
  id: string;
  label: string;
  melody: Melody;
  source: string;
  credit: string;
  license?: string;
  licenseName?: string;
}
export const beginnerSongs: StudySong[] = [
  {
    id: "frere-jacques",
    label: "Frère Jacques (Dorme, dorme) · fácil",
    melody: melody("Frère Jacques", 60, [
      quarters(60, 62, 64, 60),
      quarters(60, 62, 64, 60),
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [67, 0.5],
        [69, 0.5],
        [67, 0.5],
        [65, 0.5],
        [64, 1],
        [60, 1],
      ],
      [
        [67, 0.5],
        [69, 0.5],
        [67, 0.5],
        [65, 0.5],
        [64, 1],
        [60, 1],
      ],
      [
        [60, 1],
        [55, 1],
        [60, 2],
      ],
      [
        [60, 1],
        [55, 1],
        [60, 2],
      ],
    ]),
    source: "https://en.wikipedia.org/wiki/Fr%C3%A8re_Jacques",
    credit:
      "Melodia tradicional francesa. Adaptação solo de estudo em Dó, sem cânone; 4/4, 60 BPM.",
  },
  {
    id: "mary-lamb",
    label: "Mary Had a Little Lamb · fácil",
    melody: melody("Mary Had a Little Lamb", 60, [
      quarters(64, 62, 60, 62),
      [
        [64, 1],
        [64, 1],
        [64, 2],
      ],
      [
        [62, 1],
        [62, 1],
        [62, 2],
      ],
      [
        [64, 1],
        [67, 1],
        [67, 2],
      ],
      quarters(64, 62, 60, 62),
      quarters(64, 64, 64, 64),
      quarters(62, 62, 64, 62),
      [[60, 4]],
    ]),
    source: "https://en.wikipedia.org/wiki/Mary_Had_a_Little_Lamb",
    credit:
      "Melodia tradicional, atribuída a Lowell Mason. Adaptação solo de estudo em Dó; 4/4, 60 BPM.",
  },
  {
    id: "hot-cross-buns",
    label: "Hot Cross Buns · três notas",
    melody: melody("Hot Cross Buns", 60, [
      [
        [64, 1],
        [62, 1],
        [60, 2],
      ],
      [
        [64, 1],
        [62, 1],
        [60, 2],
      ],
      [
        [60, 0.5],
        [60, 0.5],
        [60, 0.5],
        [60, 0.5],
        [62, 0.5],
        [62, 0.5],
        [62, 0.5],
        [62, 0.5],
      ],
      [
        [64, 1],
        [62, 1],
        [60, 2],
      ],
    ]),
    source: "https://en.wikipedia.org/wiki/Hot_Cross_Buns_(song)",
    credit:
      "Melodia tradicional inglesa. Adaptação solo de estudo com Dó, Ré e Mi; 4/4, 60 BPM.",
  },
  {
    id: "london-bridge",
    label: "London Bridge · fácil",
    melody: melody("London Bridge", 60, [
      [
        [67, 1.5],
        [69, 0.5],
        [67, 1],
        [65, 1],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [62, 1],
        [64, 1],
        [65, 2],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [67, 1.5],
        [69, 0.5],
        [67, 1],
        [65, 1],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [62, 2],
        [67, 2],
      ],
      [
        [64, 1],
        [60, 3],
      ],
    ]),
    source: "https://en.wikipedia.org/wiki/London_Bridge_Is_Falling_Down",
    credit:
      "Melodia tradicional inglesa. Adaptação solo de estudo em Dó; 4/4, 60 BPM.",
  },
  {
    id: "row-your-boat",
    label: "Row, Row, Row Your Boat · fácil",
    melody: melody("Row, Row, Row Your Boat", 40, [
      [
        [60, 1],
        [60, 1],
        [60, 2 / 3],
        [62, 1 / 3],
        [64, 1],
      ],
      [
        [64, 2 / 3],
        [62, 1 / 3],
        [64, 2 / 3],
        [65, 1 / 3],
        [67, 2],
      ],
      [
        [72, 1 / 3],
        [72, 1 / 3],
        [72, 1 / 3],
        [67, 1 / 3],
        [67, 1 / 3],
        [67, 1 / 3],
        [64, 1 / 3],
        [64, 1 / 3],
        [64, 1 / 3],
        [60, 1 / 3],
        [60, 1 / 3],
        [60, 1 / 3],
      ],
      [
        [67, 2 / 3],
        [65, 1 / 3],
        [64, 2 / 3],
        [62, 1 / 3],
        [60, 2],
      ],
    ]),
    source: "https://en.wikipedia.org/wiki/Row,_Row,_Row_Your_Boat",
    credit:
      "Melodia tradicional. Adaptação solo em Dó, sem cânone; 12/8, semínima pontuada = 40. Uma oitava de extensão.",
  },
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
