import { describe, it, expect } from "vitest";
import {
  clamp,
  frequencyAt,
  normalized,
  TrackingGate,
  selectHands,
  quantize,
} from "../src/mapping/gestureMapping";
import { AdaptiveEMA } from "../src/mapping/smoothing";
import {
  defaults as baseDefaults,
  sanitize,
  type Hand,
} from "../src/types/theremin";
const defaults = {
  ...baseDefaults,
  controlMode: "antennas" as const,
  pitchLeft: false,
};

it("padrão usa esquerda na nota, direita no volume e permite inverter", () => {
  const left: Hand = {
    point: { x: 0.25, y: 0.5 },
    label: "Right",
    score: 1,
    landmarks: [],
  };
  const right: Hand = {
    point: { x: 0.75, y: 0.5 },
    label: "Left",
    score: 1,
    landmarks: [],
  };
  for (const assignment of ["screen", "anatomical"] as const) {
    expect(
      selectHands([left, right], {
        ...baseDefaults,
        controlMode: "antennas",
        assignment,
      }),
    ).toEqual({ pitch: left, volume: right });
    expect(
      selectHands([left, right], {
        ...baseDefaults,
        controlMode: "antennas",
        assignment,
        pitchLeft: false,
      }),
    ).toEqual({ pitch: right, volume: left });
  }
});
describe("mapeamento musical", () => {
  it("recupera ambas as funções quando handedness é ambígua ou duplicada", () => {
    const left: Hand = {
      point: { x: 0.25, y: 0.2 },
      label: "Left",
      score: 0.52,
      landmarks: [],
    };
    const right: Hand = {
      point: { x: 0.75, y: 0.6 },
      label: "Left",
      score: 0.99,
      landmarks: [],
    };
    for (const score of [0.52, 0.99]) {
      const volume = { ...left, score };
      const roles = selectHands([volume, right], defaults);
      expect(roles.volume).toBe(volume);
      expect(roles.pitch).toBe(right);
      const raised = normalized(
        roles.volume!.point.y,
        defaults.volumeMin,
        defaults.volumeMax,
        true,
      );
      const lowered = normalized(
        0.8,
        defaults.volumeMin,
        defaults.volumeMax,
        true,
      );
      expect(raised ** 2 * defaults.maxGain).toBeGreaterThan(
        lowered ** 2 * defaults.maxGain,
      );
    }
    expect(selectHands([right], defaults).volume).toBeUndefined();
  });
  it("mapeia extremos e centro logarítmico", () => {
    expect(frequencyAt(0, 110, 1760)).toBe(110);
    expect(frequencyAt(0.5, 110, 1760)).toBe(440);
    expect(frequencyAt(1, 110, 1760)).toBe(1760);
  });
  it("limita posições e inverte eixos", () => {
    expect(clamp(-4)).toBe(0);
    expect(clamp(4)).toBe(1);
    expect(normalized(0.15, 0.15, 0.85, true)).toBe(1);
    expect(normalized(0.85, 0.15, 0.85)).toBe(1);
  });
  it("mantém modo livre e quantiza cromático", () => {
    expect(quantize(445, "free")).toBe(445);
    expect(quantize(445, "chromatic")).toBe(440);
  });
  it("silencia sem volume e limita retenção de pitch a 150ms", () => {
    const g = new TrackingGate();
    expect(g.update(0, false, true)).toBe(false);
    expect(g.update(10, true, true)).toBe(true);
    expect(g.update(100, false, true)).toBe(true);
    expect(g.update(161, false, true)).toBe(false);
    expect(g.update(200, true, false)).toBe(false);
    expect(g.fresh(400)).toBe(false);
    g.reset();
    expect(g.update(401, false, true)).toBe(false);
  });
  it("atribuição manual não troca papel de uma única mão", () => {
    const hand: Hand = {
      point: { x: 0.8, y: 0.5 },
      label: "Right",
      score: 1,
      landmarks: [],
    };
    const s = { ...defaults, assignment: "screen" as const };
    expect(selectHands([hand], s).pitch).toBe(hand);
    expect(selectHands([hand], s).volume).toBeUndefined();
    expect(selectHands([hand], { ...s, pitchLeft: true }).volume).toBe(hand);
    // A low handedness score does not invalidate detected landmarks.
    expect(selectHands([{ ...hand, score: 0.2 }], s).pitch).toBeDefined();
  });
  it("EMA converge sem overshoot e reinicia sem posição antiga", () => {
    const f = new AdaptiveEMA();
    f.update(0, 0.016, 0.1);
    const first = f.update(1, 0.016, 0.1);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    for (let i = 0; i < 60; i++) f.update(1, 0.016, 0.1);
    expect(f.update(1, 0.016, 0.1)).toBeCloseTo(1, 3);
    f.reset();
    expect(f.update(0.2, 0.016, 0.1)).toBe(0.2);
  });
  it("protege configurações persistidas inválidas", () => {
    const s = sanitize({ maxGain: 3, pitchMin: 0.9, pitchMax: 0.1, fMin: NaN });
    expect(s.maxGain).toBe(0.25);
    expect(s.pitchMax).toBeGreaterThan(s.pitchMin);
    expect(s.fMin).toBe(defaults.fMin);
  });
});
