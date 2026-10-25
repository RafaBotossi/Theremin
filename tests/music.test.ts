import { expect, it } from "vitest";
import { parseMidi } from "../src/music/midi";
import { frameAt, isPolyphonic } from "../src/music/song";
const text = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const word = (n: number) => [(n >>> 8) & 255, n & 255];
const long = (n: number) => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];
function midi(tracks: number[][]) {
  return new Uint8Array([
    ...text("MThd"),
    ...long(6),
    ...word(tracks.length > 1 ? 1 : 0),
    ...word(tracks.length),
    ...word(480),
    ...tracks.flatMap((t) => [...text("MTrk"), ...long(t.length), ...t]),
  ]).buffer;
}
const end = [0, 255, 47, 0];
it("aplica o mapa de tempo de outra trilha às durações", () => {
  const tempo = [
    0,
    255,
    81,
    3,
    7,
    161,
    32,
    131,
    96,
    255,
    81,
    3,
    15,
    66,
    64,
    ...end,
  ];
  const line = [0, 144, 60, 100, 135, 64, 128, 60, 0, ...end];
  const parsed = parseMidi(midi([tempo, line]));
  expect(parsed[0].notes).toEqual([{ midi: 60, start: 0, duration: 1.5 }]);
});
it("interpreta running status, note-on zero e pausas", () => {
  const line = [
    0,
    144,
    60,
    100,
    131,
    96,
    60,
    0,
    131,
    96,
    62,
    100,
    131,
    96,
    62,
    0,
    ...end,
  ];
  expect(parseMidi(midi([line]))[0].notes).toEqual([
    { midi: 60, start: 0, duration: 0.5 },
    { midi: 62, start: 1, duration: 0.5 },
  ]);
});
it("separa canais e descarta percussão", () => {
  const line = [
    0,
    144,
    60,
    100,
    0,
    145,
    64,
    100,
    0,
    153,
    36,
    100,
    131,
    96,
    128,
    60,
    0,
    0,
    129,
    64,
    0,
    0,
    137,
    36,
    0,
    ...end,
  ];
  expect(parseMidi(midi([line])).map((t) => t.notes[0].midi)).toEqual([60, 64]);
});
it("rejeita MIDI truncado, notas sem término e formato inválido", () => {
  expect(() => parseMidi(new ArrayBuffer(4))).toThrow();
  expect(() => parseMidi(midi([[0, 144, 60, 100, ...end]]))).toThrow(
    /sem término/,
  );
  const file = midi([[0, 144, 60, 100, 131, 96, 128, 60, 0, ...end]]);
  new DataView(file).setUint16(8, 2);
  expect(() => parseMidi(file)).toThrow(/formato/);
});
it("troca o destaque no instante da nota e respeita silêncio entre notas", () => {
  const notes = [
    { midi: 60, start: 0, duration: 0.5 },
    { midi: 62, start: 1, duration: 1 },
  ];
  expect(frameAt(notes, -1).current).toBeNull();
  expect(frameAt(notes, 0).current?.midi).toBe(60);
  expect(frameAt(notes, 0.5).current).toBeNull();
  expect(frameAt(notes, 0.5).next?.midi).toBe(62);
  expect(frameAt(notes, 1).current?.midi).toBe(62);
  expect(frameAt(notes, 2).current).toBeNull();
  expect(
    isPolyphonic([
      { midi: 60, start: 0, duration: 2 },
      { midi: 64, start: 1, duration: 1 },
    ]),
  ).toBe(true);
});
