import { expect, it } from "vitest";
import { defaults, emptyReading, type Hand } from "../src/types/theremin";
import { indexExtension, selectWand } from "../src/vision/indexExtension";
import { selectHands, frequencyAt } from "../src/mapping/gestureMapping";
import {
  pitchPoint,
  pitchControl,
  pitchScreenPosition,
  volumeControl,
} from "../src/mapping/antennaMapping";
import { emptyMatch, matchNote } from "../src/music/noteMatch";
function hand(x: number, label = "Left"): Hand {
  const landmarks = Array.from({ length: 21 }, () => ({ x, y: 0.7, z: 0 }));
  for (let id = 5; id <= 8; id++)
    landmarks[id] = { x, y: 0.7 - (id - 5) * 0.1, z: 0 };
  return { point: { x: 0.9, y: 0.9 }, landmarks, label, score: 0.5 };
}
it("qualquer indicador e qualquer palma podem assumir os controles", () => {
  const left = { ...hand(0.8, "Left"), palmOpen: false };
  const right = { ...hand(0.2, "Right"), palmOpen: true };
  expect(selectHands([right, left], defaults)).toEqual({
    pitch: left,
    volume: right,
  });
  expect(selectHands([left], defaults).pitch).toBe(left);
  right.palmOpen = false;
  left.palmOpen = true;
  expect(selectHands([left, right], defaults)).toEqual({
    pitch: right,
    volume: left,
  });
  expect(pitchPoint(right, defaults)).toBe(right.landmarks[8]);
  const volume = volumeControl(left, defaults);
  left.landmarks = left.landmarks.map((p) => ({ ...p, y: p.y - 0.2 }));
  expect(volumeControl(left, defaults)).toBeGreaterThan(volume);
});

it("dobra silencia; extensão independe de escala, rotação e distância", () => {
  const h = hand(0.5);
  expect(indexExtension(h.landmarks)).toBeCloseTo(1);
  expect(
    indexExtension(
      h.landmarks.map((p) => ({ x: p.y * 3 + 2, y: -p.x * 3 + 1 })),
    ),
  ).toBeCloseTo(1);
  h.landmarks[8] = { ...h.landmarks[6] };
  expect(selectWand([h])).toBeUndefined();
  expect(indexExtension([])).toBe(0);
});
it("mantém a mão ativa quando a ordem do detector troca e transfere se ela dobra", () => {
  const left = hand(0.2),
    right = hand(0.8, "Right");
  expect(selectWand([right, left], left)).toBe(left);
  left.landmarks[8] = { ...left.landmarks[6] };
  expect(selectWand([left, right], left)).toBe(right);
});
it("posição visual do alvo corresponde à frequência tocada na mesma oitava", () => {
  for (const invertPitch of [false, true])
    for (const f of [220, 440, 880]) {
      const s = { ...defaults, invertPitch };
      const h = hand(pitchScreenPosition(f, s));
      expect(frequencyAt(pitchControl(h, s), s.fMin, s.fMax)).toBeCloseTo(f);
    }
});
it("acerto exige som e 250ms na oitava correta; repetição exige soltar", () => {
  const r = {
    ...emptyReading,
    frequency: 440,
    pitch: true,
    volume: true,
    gain: 0.1,
  };
  let state = { ...emptyMatch };
  for (const t of [100, 200, 300]) {
    const n = matchNote(state, r, 69, t, true);
    expect(n.passed).toBe(false);
    state = n;
  }
  expect(matchNote(state, r, 69, 400, true).passed).toBe(true);
  for (const reading of [
    { ...r, frequency: 880 },
    { ...r, gain: 0 },
    { ...r, pitch: false },
  ])
    expect(matchNote(state, reading, 69, 400, true).passed).toBe(false);
  expect(matchNote(state, r, 69, 400, false).passed).toBe(false);
  const latched = matchNote({ ...emptyMatch, release: true }, r, 69, 100, true);
  expect(latched.held).toBe(0);
  expect(latched.release).toBe(true);
  expect(
    matchNote(latched, { ...r, pitch: false, gain: 0 }, 69, 200, true).release,
  ).toBe(false);
});

it("accepts either simultaneous voice without reusing an older held pinch", () => {
  const reading = {
    ...emptyReading,
    pitch: true,
    volume: true,
    gain: 0.1,
    frequency: 330,
    attack: 2,
    voices: [
      { frequency: 440, attack: 1 },
      { frequency: 330, attack: 2 },
    ],
  };
  let state = { ...emptyMatch };
  for (const now of [100, 200, 300, 400])
    state = matchNote(state, reading, 69, now, true);
  expect(state.held).toBeGreaterThanOrEqual(250);
  state = { ...emptyMatch, release: true, attack: 2 };
  for (const now of [500, 600, 700, 800])
    state = matchNote(state, reading, 69, now, true);
  expect(state.release).toBe(true);
  expect(state.held).toBe(0);
  const reclosed = {
    ...reading,
    attack: 3,
    voices: [
      { frequency: 440, attack: 3 },
      { frequency: 330, attack: 2 },
    ],
  };
  for (const now of [900, 1000, 1100, 1200])
    state = matchNote(state, reclosed, 69, now, true);
  expect(state.held).toBeGreaterThanOrEqual(250);
});
