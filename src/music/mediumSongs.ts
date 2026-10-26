import { melody, type StudySong } from "./beginnerSongs";

// Solo study editions. Note lengths are quarter-note beats; '-' is a rest.
// Explicit bars preserve pickups, rests and the timing of the source melody.
function score(name: string, bpm: number, bars: string[]) {
  const ties = new Set<number>();
  let noteIndex = 0;
  const result = melody(
    name,
    bpm,
    bars.map((bar) =>
      bar.split(" ").map((token) => {
        const tied = token.endsWith("~");
        const [pitch, length] = token.replace(/~$/, "").split(":");
        const beats = Number(length ?? 1);
        if (!(beats > 0)) throw Error(`Invalid duration: ${token}`);
        if (pitch === "-") return [null, beats];
        if (tied) ties.add(noteIndex);
        noteIndex++;
        const match = /^([A-G])([#b]?)([3-6])$/.exec(pitch);
        if (!match) throw Error(`Invalid note: ${token}`);
        const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[
          match[1] as "C"
        ];
        return [
          12 * (Number(match[3]) + 1) +
            semitone +
            (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0),
          beats,
        ];
      }),
    ),
  );
  const notes: typeof result.notes = [];
  for (const [i, note] of result.notes.entries()) {
    const previous = notes.at(-1);
    if (ties.has(i - 1)) {
      if (
        !previous ||
        previous.midi !== note.midi ||
        Math.abs(previous.start + previous.duration - note.start) > 1e-7
      )
        throw new Error(`Invalid tie in ${name}`);
      previous.duration += note.duration;
    } else notes.push({ ...note });
  }
  if (ties.has(result.notes.length - 1))
    throw new Error(`Unfinished tie in ${name}`);
  return { ...result, notes };
}
const greenA = [
  "C5:2 D5",
  "E5:1.5 F5:0.5 E5",
  "D5:2 B4",
  "G4:1.5 A4:0.5 B4",
  "C5:2 A4",
  "A4:1.5 G#4:0.5 A4",
  "B4:2 G#4",
  "E4:2 A4",
];
const greenEnd = ["C5:1.5 B4:0.5 A4", "G#4:1.5 F#4:0.5 G#4", "A4:3", "A4:3"];
const minuetA = [
  "D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5",
  "D5 G4 G4",
  "E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5",
  "G5 G4 G4",
  "C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5",
  "B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5",
  "F#4 G4:0.5 A4:0.5 B4:0.5 G4:0.5",
  "A4:3",
];
export const mediumSongs: StudySong[] = [
  {
    id: "moonlight",
    label: "Moonlight · Sonata ao Luar · Beethoven",
    melody: score("Moonlight · introdução e temas · compassos 1–27", 44, [
      Array(4)
        .fill(`G#3:${1 / 3} C#4:${1 / 3} E4:${1 / 3}`)
        .join(" "),
      Array(4)
        .fill(`G#3:${1 / 3} C#4:${1 / 3} E4:${1 / 3}`)
        .join(" "),
      `A3:${1 / 3} C#4:${1 / 3} E4:${1 / 3} A3:${1 / 3} C#4:${1 / 3} E4:${1 / 3} A3:${1 / 3} D4:${1 / 3} F#4:${1 / 3} A3:${1 / 3} D4:${1 / 3} F#4:${1 / 3}`,
      `G#3:${1 / 3} C4:${1 / 3} F#4:${1 / 3} G#3:${1 / 3} C#4:${1 / 3} E4:${1 / 3} G#3:${1 / 3} C#4:${1 / 3} D#4:${1 / 3} F#3:${1 / 3} C4:${1 / 3} D#4:${1 / 3}`,
      "-:3 G#4:0.75 G#4:0.25",
      "G#4:3 G#4:0.75 G#4:0.25",
      "G#4:2 A4:2",
      "G#4:2 F#4 B4",
      "E4 -:3",
      "-:3 G4:0.75 G4:0.25",
      "G4:3 G4:0.75 G4:0.25",
      "G4:3 F#4",
      "F#4:2 G4 E4",
      "F#4:2 F#4:2",
      "B3 -:2 B4",
      "C5:3 A#4",
      "B4:3 B4",
      "C5:3 A#4",
      "B4:2 B4:2",
      "B4:2 A4:2",
      "G4:2 F#4:2",
      "C#4:2 C#4 C#4",
      "F#3 -:2 C#5:0.75 C#5:0.25",
      "C#5:3 C#5:0.75 C#5:0.25",
      "C#5:2 C5 C#5",
      "D#5:3 D#5",
      "E5:2 D#5 C#5",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=276",
    credit:
      "Beethoven · edição Stewart Holmes, © 2007. Primeiro movimento, compassos 1–27: arpejos iniciais, depois melodia superior sem acompanhamento. Dó sustenido menor, semínima = 44; pausas e ritmos preservados.",
    license: "https://creativecommons.org/licenses/by-sa/2.5/",
    licenseName: "CC BY-SA 2.5",
  },
  {
    id: "gymnopedie-1",
    label: "Gymnopédie nº 1 · Satie · versão ampliada",
    melody: score("Gymnopédie nº 1 · primeira seção · compassos 5–39", 40, [
      "- F#5 A5",
      "G5 F#5 C#5",
      "B4 C#5 D5",
      "A4:3",
      "F#4:3~",
      "F#4:3~",
      "F#4:3~",
      "F#4:3",
      "- F#5 A5",
      "G5 F#5 C#5",
      "B4 C#5 D5",
      "A4:3",
      "C#5:3",
      "F#5:3",
      "E4:3~",
      "E4:3~",
      "E4:3",
      "A4 B4 C5",
      "E5 D5 B4",
      "D5 C5 B4",
      "D5:3~",
      "D5:2 D5",
      "E5 F5 G5",
      "A5 C5 D5",
      "E5 D5 B4",
      "D5:3~",
      "D5:2 D5",
      "G5:3",
      "F#5:3",
      "B4 A4 B4",
      "C#5 D5 E5",
      "C#5 D5 E5",
      "F#4:3",
      "C5:3",
      "D5:3",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37",
    credit:
      "Satie · edição Evin Robertson, domínio público. Primeira seção, compassos 5–39; sem introdução, acompanhamento ou repetição. 3/4, semínima = 40. Ligaduras preservadas; acordes finais reduzidos à nota superior.",
  },
  {
    id: "fur-elise",
    label: "Für Elise · Beethoven · tema",
    melody: score("Für Elise · tema inicial", 60, [
      "E5:0.5 D#5:0.5",
      "E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5",
      "A4 -:0.5 C4:0.5 E4:0.5 A4:0.5",
      "B4 -:0.5 E4:0.5 G#4:0.5 B4:0.5",
      "C5 -:0.5 E4:0.5 E5:0.5 D#5:0.5",
      "E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5",
      "A4 -:0.5 C4:0.5 E4:0.5 A4:0.5",
      "B4 -:0.5 E4:0.5 C5:0.5 B4:0.5",
      "A4:2",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931",
    credit:
      "Beethoven · edição Stelios Samelis, domínio público. Tema inicial, mão direita, sem repetição. Valores rítmicos dobrados para estudo em 3/4, 60 BPM; anacruse e pausas preservadas.",
  },
  {
    id: "new-world-largo",
    label: "Novo Mundo · Dvořák · Largo",
    melody: score("Sinfonia do Novo Mundo · tema Largo", 48, [
      "E4:0.75 G4:0.25 G4 E4:0.75 D4:0.25 C4",
      "D4:0.75 E4:0.25 G4:0.75 E4:0.25 D4:2",
      "E4:0.75 G4:0.25 G4 E4:0.75 D4:0.25 C4",
      "D4:0.5 E4:0.5 D4:0.75 C4:0.25 C4:2",
      "A4:0.75 C5:0.25 C5 B4:0.5 G4:0.5 A4",
      "A4:0.5 C5:0.5 B4:0.5 G4:0.5 A4:2",
      "A4:0.75 C5:0.25 C5 B4:0.5 G4:0.5 A4",
      "A4:0.5 C5:0.5 B4:0.5 G4:0.5 A4:2",
      "E4:0.75 G4:0.25 G4 E4:0.5 D4:0.5 C4",
      "D4:0.75 E4:0.25 G4:0.75 E4:0.25 D4:2",
      "E4:0.75 G4:0.25 G4 C4:0.75 D4:0.25 E4",
      "D4:0.75 C4:0.25 D4:0.5 A3:0.5 C4:2",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1793",
    credit:
      "Dvořák · edição Keith OHara, © 2011. Solo do corne inglês, compassos 7–18 do Largo, transposto para Dó; 4/4, 48 BPM. Sem acompanhamento orquestral.",
    license: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    id: "greensleeves",
    label: "Greensleeves",
    melody: score("Greensleeves", 84, [
      "A4",
      ...greenA,
      ...greenA.slice(0, 4),
      ...greenEnd,
      "G5:3",
      "G5:1.5 F5:0.5 E5",
      ...greenA.slice(2, 7),
      "E4:3",
      "G5:3",
      "G5:1.5 F5:0.5 E5",
      ...greenA.slice(2, 4),
      ...greenEnd,
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=109",
    credit:
      "Tradicional · edição Aaron Fontaine · domínio público. Melodia solo, Lá menor, 84 BPM.",
  },
  {
    id: "silent-night",
    label: "Noite Feliz",
    melody: score("Noite Feliz", 66, [
      "G4:1.5 A4:0.5 G4",
      "E4:3",
      "G4:1.5 A4:0.5 G4",
      "E4:3",
      "D5:2 D5",
      "B4:3",
      "C5:2 C5",
      "G4:3",
      "A4:2 A4",
      "C5:1.5 B4:0.5 A4",
      "G4:1.5 A4:0.5 G4",
      "E4:3",
      "A4:2 A4",
      "C5:1.5 B4:0.5 A4",
      "G4:1.5 A4:0.5 G4",
      "E4:3",
      "D5:2 D5",
      "F5:1.5 D5:0.5 B4",
      "C5:2 C5",
      "E5:3",
      "C5 G4 E4",
      "G4:1.5 F4:0.5 D4",
      "C4:3",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=521",
    credit:
      "F. X. Gruber · edição Daniel Widyanto / Mutopia, © 2004. Melodia transposta para Dó; tônica final acrescentada a partir do acompanhamento. 66 BPM.",
    license: "https://creativecommons.org/licenses/by-sa/2.0/",
    licenseName: "CC BY-SA 2.0",
  },
  {
    id: "brahms-lullaby",
    label: "Canção de Ninar · Brahms",
    melody: score("Canção de Ninar", 72, [
      "E4:0.5 E4:0.5",
      "G4:1.5 E4:0.5 E4",
      "G4 - E4:0.5 G4:0.5",
      "C5 B4:1.5 A4:0.5",
      "A4 G4 D4:0.5 E4:0.5",
      "F4 D4 D4:0.5 E4:0.5",
      "F4 - D4:0.5 F4:0.5",
      "B4:0.5 A4:0.5 G4 B4",
      "C5 - C4:0.5 C4:0.5",
      "C5:2 A4:0.5 F4:0.5",
      "G4:2 E4:0.5 C4:0.5",
      "F4 G4 A4",
      "G4:2 C4:0.5 C4:0.5",
      "C5:2 A4:0.5 F4:0.5",
      "G4:2 E4:0.5 C4:0.5",
      "F4 E4 D4",
      "C4:2",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1037",
    credit:
      "J. Brahms · edição Shogo Mori · domínio público. Voz solo em Dó, sem introdução de piano, repetições ou notas de graça. 72 BPM.",
  },
  {
    id: "minuet-g",
    label: "Minueto em Sol · Petzold",
    melody: score("Minueto em Sol", 72, [
      ...minuetA,
      ...minuetA.slice(0, 6),
      "A4 B4:0.5 A4:0.5 G4:0.5 F#4:0.5",
      "G4:3",
      "B5 G5:0.5 A5:0.5 B5:0.5 G5:0.5",
      "A5 D5:0.5 E5:0.5 F#5:0.5 D5:0.5",
      "G5 E5:0.5 F#5:0.5 G5:0.5 D5:0.5",
      "C#5 B4:0.5 C#5:0.5 A4",
      "A4:0.5 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F#5:0.5",
      "G5 F#5 E5",
      "F#5 A4 C#5",
      "D5:3",
      "D5 G4:0.5 F#4:0.5 G4",
      "E5 G4:0.5 F#4:0.5 G4",
      "D5 C5 B4",
      "A4:0.5 G4:0.5 F#4:0.5 G4:0.5 A4",
      "D4:0.5 E4:0.5 F#4:0.5 G4:0.5 A4:0.5 B4:0.5",
      "C5 B4 A4",
      "B4:0.5 D5:0.5 G4 F#4",
      "G4:3",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=75",
    credit:
      "C. Petzold, BWV Anh. 114 · edição Allen Garvin · domínio público. Voz superior, sem ornamentos nem repetições, 72 BPM.",
  },
  {
    id: "ave-maria",
    label: "Ave Maria · tema de Schubert",
    melody: score("Ave Maria · tema", 60, [
      "Bb4:1.5 A4:0.25 Bb4:0.25 D5:1.75 C5:0.25",
      "Bb4 - C5 Bb4:0.25 A4:0.25 G4:0.25 A4:0.25",
      "Bb4 -:0.5 D5:0.5 D5:0.75 C5:0.125 Bb4:0.125 A4:0.25 G4:0.25 D5:0.25 E5:0.25",
      "D5 C#5:0.75 A4:0.25 C5:0.75 Bb4:0.25 A4:0.166666666667 C5:0.166666666667 D5:0.166666666666 Eb5:0.166666666667 C5:0.166666666667 A4:0.166666666666",
      "Bb4:1.5 D5:0.25 C5:0.25 C5:0.75 A4:0.25 G4:0.166666666667 B4:0.166666666667 D5:0.166666666666 F5:0.166666666667 D5:0.166666666667 B4:0.166666666666",
      "C5:1.166666666667 G4:0.166666666667 A4:0.166666666666 Bb4:0.166666666667 A4:0.166666666667 G4:0.166666666666 F4 -:0.5 F4:0.5",
      "C5:0.75 C5:0.25 C5:0.375 B4:0.125 C5:0.375 D5:0.125 C5:0.375 D5:0.125 Bb4:0.5 -:0.5 Bb4:0.5",
      "C5:0.75 C5:0.25 C5:0.166666666667 B4:0.166666666667 C5:0.166666666666 Eb5:0.166666666667 D5:0.166666666667 C5:0.166666666666 Bb4 -:0.5 Bb4:0.5",
      "C5:0.75 C5:0.25 D5:0.375 D5:0.125 D5:0.166666666667 C5:0.166666666667 D5:0.166666666666 Eb5:0.5 Eb5:0.5 -:0.75 G4:0.25",
      "C5:0.75 C5:0.25 Bb4:0.166666666667 A4:0.166666666667 Bb4:0.166666666666 Db5:0.166666666667 C5:0.166666666667 Bb4:0.166666666666 C5:1.5 -:0.5",
      "Bb4:1.5 A4:0.25 Bb4:0.25 D5:1.75 C5:0.25",
      "Bb4:4",
    ]),
    source: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1054",
    credit:
      "F. Schubert · edição Ph. Raynaud, domínio público. Tema vocal (compassos 3–14), sem piano e ornamentos; nota final sustentada. 60 BPM.",
  },
];
