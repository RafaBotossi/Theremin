import { expect, it } from "vitest";
import { maskPixels } from "../src/vision/musicalBackground";
it("keeps the person opaque, removes the background and feathers uncertain edges", () => {
  const pixels = maskPixels(new Float32Array([0, 0.15, 0.5, 0.85, 1, NaN]));
  const alphas = Array.from({ length: 6 }, (_, i) => pixels[i * 4 + 3]);
  expect(alphas).toEqual([0, 0, 128, 255, 255, 0]);
});
