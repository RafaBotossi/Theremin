import { expect, it } from "vitest";
import { VoiceDSP, SafetyLimiterDSP } from "../public/audio/dsp.js";
const rate = 48000;
function params() {
  return Object.fromEntries(
    Object.entries({
      logFrequency: Math.log(440),
      gain: 0.18,
      glide: 0.012,
      vibratoRate: 5.5,
      vibratoDepth: 12,
      vibratoExpression: 0,
      h1: 1,
      h2: 0.28,
      h3: 0.12,
      h4: 0.05,
      h5: 0.02,
    }).map(([k, v]) => [k, new Float32Array([v])]),
  );
}
function render(dsp, p, seconds) {
  const output = new Float32Array(Math.round(seconds * rate));
  dsp.render(output, p);
  return output;
}
function rms(a) {
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
}
function amplitude(a, f) {
  let re = 0,
    im = 0;
  for (let i = 0; i < a.length; i++) {
    re += a[i] * Math.cos((2 * Math.PI * f * i) / rate);
    im += a[i] * Math.sin((2 * Math.PI * f * i) / rate);
  }
  return (2 * Math.hypot(re, im)) / a.length;
}
it("renders the requested five partials with negligible DC and no extra oscillator", () => {
  const d = new VoiceDSP(rate),
    p = params();
  render(d, p, 0.5);
  const a = render(d, p, 1);
  const fundamental = amplitude(a, 440);
  for (const [i, relative] of [1, 0.28, 0.12, 0.05, 0.02].entries())
    expect(amplitude(a, 440 * (i + 1)) / fundamental).toBeCloseTo(relative, 3);
  expect(Math.abs(a.reduce((s, x) => s + x, 0) / a.length)).toBeLessThan(1e-5);
  expect(amplitude(a, 2640)).toBeLessThan(1e-5);
});
it("smooths log pitch and gain without restarting phase; releases silently", () => {
  const d = new VoiceDSP(rate),
    p = params();
  p.logFrequency[0] = Math.log(220);
  render(d, p, 1);
  p.logFrequency[0] = Math.log(880);
  const a = render(d, p, 0.012);
  expect(d.logFrequency).toBeCloseTo(
    Math.log(880) + (Math.log(220) - Math.log(880)) * Math.exp(-1),
    3,
  );
  expect(
    Math.max(...a.slice(1).map((x, i) => Math.abs(x - a[i]))),
  ).toBeLessThan(0.06);
  p.gain[0] = 0;
  render(d, p, 0.3);
  expect(rms(render(d, p, 0.1))).toBeLessThan(1e-6);
});
it("vibrato is absent until expression is held and fades on release", () => {
  const d = new VoiceDSP(rate),
    p = params();
  render(d, p, 1);
  expect(d.depth).toBe(0);
  p.vibratoExpression[0] = 1;
  render(d, p, 0.3);
  expect(d.depth).toBeCloseTo(12, 2);
  p.vibratoExpression[0] = 0;
  render(d, p, 0.3);
  expect(d.depth).toBeLessThan(0.001);
});
it("fades partials before Nyquist at low sample rates", () => {
  const d = new VoiceDSP(32000),
    p = params();
  p.logFrequency[0] = Math.log(4000);
  p.h1[0] = 0;
  p.h2[0] = 0;
  p.h3[0] = 0;
  p.h4[0] = 1;
  p.h5[0] = 1;
  render(d, p, 1);
  expect(rms(render(d, p, 0.2))).toBeLessThan(1e-7);
});
it("stereo safety limiter bounds overloaded impulses, preserves quiet audio and recovers", () => {
  const d = new SafetyLimiterDSP(rate),
    left = new Float32Array(48000),
    right = new Float32Array(48000);
  left[1000] = 12;
  right[1000] = -8;
  for (let i = 0; i < 1000; i++) {
    left[i] = 0.1;
    right[i] = 0.2;
  }
  const out = [new Float32Array(48000), new Float32Array(48000)];
  d.render([left, right], out);
  expect(out[0][500]).toBeCloseTo(0.1);
  expect(out[1][500]).toBeCloseTo(0.2);
  expect(Math.max(...out[0].map(Math.abs))).toBeLessThanOrEqual(0.941);
  expect(Math.max(...out[1].map(Math.abs))).toBeLessThanOrEqual(0.941);
  expect(d.gain).toBeGreaterThan(0.999);
});
