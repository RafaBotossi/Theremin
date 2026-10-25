import { afterEach, expect, it } from "vitest";
import {
  defaults as baseDefaults,
  emptyReading,
  loadSettings,
  type Hand,
} from "../src/types/theremin";
import {
  pitchControl,
  pitchPoint,
  pitchScreenPosition,
  volumeControl,
} from "../src/mapping/antennaMapping";
import { frequencyAt } from "../src/mapping/gestureMapping";
import { fingerOpenness } from "../src/vision/fingerOpenness";
import { initialPractice, practiceStep } from "../src/mapping/practice";
const defaults = { ...baseDefaults, pitchLeft: false };
const hand = (x: number, y = 0.5, openness = 0.5): Hand => ({
  point: { x, y },
  openness,
  label: "Left",
  score: 1,
  landmarks: [],
});
afterEach(() => localStorage.clear());
it("aproximar da haste sobe a nota e cruzar mantém o limite", () => {
  expect(pitchControl(hand(0.8), defaults)).toBeGreaterThan(
    pitchControl(hand(0.7), defaults),
  );
  expect(pitchControl(hand(0.95), defaults)).toBe(1);
  for (const pitchLeft of [false, true])
    for (const invertPitch of [false, true])
      for (const sensitivity of [0.5, 1, 2]) {
        const s = { ...defaults, pitchLeft, invertPitch, sensitivity };
        for (const f of [330, 440, 660]) {
          expect(
            frequencyAt(
              pitchControl(hand(pitchScreenPosition(f, s)), s),
              s.fMin,
              s.fMax,
            ),
          ).toBeCloseTo(f);
        }
      }
});
it("dedos mudam a frequência com a palma parada", () => {
  for (const pitchLeft of [true, false]) {
    const s = { ...defaults, pitchLeft };
    const mirror = (x: number) => (pitchLeft ? 1 - x : x);
    const h = hand(mirror(0.65));
    h.landmarks = Array.from({ length: 21 }, () => ({
      x: mirror(0.7),
      y: 0.5,
    }));
    const initial = pitchControl(h, s);
    h.landmarks[12] = { x: mirror(0.8), y: 0.5 };
    expect(pitchPoint(h, s)).toBe(h.landmarks[12]);
    expect(pitchControl(h, s)).toBeGreaterThan(initial);
    const moved = pitchControl(h, s);
    h.point.x = mirror(0.6);
    h.openness = 0;
    expect(pitchControl(h, s)).toBe(moved);
    h.landmarks[4] = { x: mirror(0.85), y: 0.5 };
    expect(pitchPoint(h, s)).toBe(h.landmarks[4]);
  }
  expect(volumeControl(hand(0.25, 0.8), defaults)).toBe(0);
  expect(volumeControl(hand(0.25, 0.95), defaults)).toBe(0);
  expect(volumeControl(hand(0.25, 0.55), defaults)).toBeCloseTo(1);
});
it("abertura usa ângulos e não tamanho ou posição da mão", () => {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const b of [5, 9, 13, 17]) {
    points[b] = { x: 0, y: 0, z: 0 };
    points[b + 1] = { x: 0, y: 1, z: 0 };
    points[b + 3] = { x: 0, y: 2, z: 0 };
  }
  expect(fingerOpenness(points)).toBeCloseTo(1);
  expect(
    fingerOpenness(
      points.map((p) => ({ x: p.y * 3 + 9, y: -p.x * 3 + 4, z: p.z * 3 })),
    ),
  ).toBeCloseTo(1);
  for (const b of [5, 9, 13, 17]) points[b + 3] = { x: 0, y: 0, z: 0 };
  expect(fingerOpenness(points)).toBe(0);
  expect(fingerOpenness([])).toBe(0.5);
});
it("migração mantém a pentatônica escolhida", () => {
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ scale: "pentatonic", vibrato: 8 }),
  );
  expect(loadSettings()).toMatchObject({
    controlMode: "antennas",
    scale: "pentatonic",
    vibrato: 0,
  });
});
it("treino exige nota sustentada e silêncio intencional para avançar", () => {
  const r = {
    ...emptyReading,
    pitch: true,
    volume: true,
    gain: 0.1,
    frequency: 440,
  };
  let state = { ...initialPractice };
  for (let t = 100; t <= 2200; t += 100)
    state = practiceStep(state, r, 440, t, true);
  expect(state.ready).toBe(true);
  for (let t = 2300; t <= 3000; t += 100)
    state = practiceStep(state, { ...r, volume: false, gain: 0 }, 440, t, true);
  expect(state.advance).toBe(false);
  for (let t = 3100; t <= 3300; t += 100)
    state = practiceStep(state, { ...r, gain: 0 }, 440, t, true);
  expect(state.advance).toBe(true);
  state = practiceStep(
    { ...initialPractice, held: 1, last: 100 },
    { ...r, frequency: 460 },
    440,
    200,
    false,
  );
  expect(state.held).toBe(0);
});
