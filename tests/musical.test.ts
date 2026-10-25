import { afterEach, expect, it } from "vitest";
import { quantize } from "../src/mapping/gestureMapping";
import { applyPreset, harmonics } from "../src/audio/presets";
import { defaults, loadSettings } from "../src/types/theremin";
import { notePosition } from "../src/components/NoteGuide";
afterEach(() => localStorage.clear());
it("aproxima notas sem degraus nem inversões no movimento", () => {
  const cents = (f: number) => 1200 * Math.log2(f / 440);
  const f = 440 * 2 ** (20 / 1200);
  expect(Math.abs(cents(quantize(f, "assisted")))).toBeLessThan(10);
  let previous = quantize(400, "assisted");
  for (let f = 400.01; f <= 500; f += 0.01) {
    const next = quantize(f, "assisted");
    expect(next).toBeGreaterThan(previous);
    expect(next - previous).toBeLessThan(0.05);
    previous = next;
  }
  expect(quantize(440, "assisted")).toBe(440);
});
it("presets preservam volume máximo, calibração e inversões", () => {
  const s = {
    ...defaults,
    maxGain: 0.07,
    pitchMin: 0.23,
    pitchMax: 0.75,
    pitchLeft: true,
    invertPitch: true,
  };
  for (const key of ["melodic", "strings", "space"] as const) {
    const p = applyPreset(s, key);
    expect(p).toMatchObject({
      maxGain: 0.07,
      pitchMin: 0.23,
      pitchMax: 0.75,
      pitchLeft: true,
      invertPitch: true,
    });
    expect(p.waveform).not.toBe("sine");
  }
  expect(
    harmonics.theremin.slice(2).filter((n) => n > 0).length,
  ).toBeGreaterThan(2);
});
it("régua respeita limites, sensibilidade e inversão", () => {
  const defaults = { ...loadSettings(), controlMode: "screen" as const };
  expect(notePosition(220, defaults)).toBeCloseTo(0.15);
  expect(notePosition(440, defaults)).toBeCloseTo(0.5);
  expect(notePosition(880, defaults)).toBeCloseTo(0.85);
  expect(notePosition(220, { ...defaults, invertPitch: true })).toBeCloseTo(
    0.85,
  );
  expect(notePosition(220, { ...defaults, sensitivity: 2 })).toBeCloseTo(0.325);
});
it("atualiza apenas o som legado padrão sem perder calibração", () => {
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({
      ...defaults,
      brightness: undefined,
      waveform: "sine",
      scale: "free",
      fMin: 110,
      fMax: 1760,
      pitchMin: 0.3,
      maxGain: 0.08,
    }),
  );
  expect(loadSettings()).toMatchObject({
    waveform: "theremin",
    scale: "free",
    fMin: 220,
    fMax: 880,
    pitchMin: 0.3,
    maxGain: 0.08,
  });
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ ...defaults, waveform: "triangle" }),
  );
  expect(loadSettings().waveform).toBe("triangle");
});
