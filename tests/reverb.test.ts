import { expect, it } from "vitest";
import { hallImpulse } from "../src/audio/reverb";
import { thumbVibrato } from "../src/vision/thumbVibrato";
it("generates deterministic stereo reflections and a decaying two-second tail", () => {
  const channels: Float32Array[] = [];
  const context = {
    sampleRate: 48000,
    createBuffer: (_n: number, length: number) => {
      channels.push(new Float32Array(length), new Float32Array(length));
      return { getChannelData: (n: number) => channels[n] };
    },
  };
  hallImpulse(context as unknown as BaseAudioContext);
  const [l, r] = channels;
  expect(l.length / 48000).toBeCloseTo(2.2, 4);
  expect(l).not.toEqual(r);
  const rms = (a: Float32Array) =>
    Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
  expect(rms(l.slice(0, 800))).toBe(0);
  const early = rms(l.slice(4800, 9600)),
    late = rms(l.slice(100800, 105600));
  expect(20 * Math.log10(late / early)).toBeLessThan(-55);
});
it("thumb vibrato is neutral when closed and scales independently of camera position", () => {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  points[17] = { x: 1, y: 0, z: 0 };
  points[4] = { x: 0.3, y: 0, z: 0 };
  expect(thumbVibrato(points)).toBe(0);
  points[4] = { x: 1.5, y: 0, z: 0 };
  expect(thumbVibrato(points)).toBe(1);
  expect(
    thumbVibrato(
      points.map((p) => ({ x: p.x * 2 + 8, y: p.y * 2 + 4, z: p.z * 2 })),
    ),
  ).toBe(1);
  expect(thumbVibrato([])).toBe(0);
});
