import { expect, it } from "vitest";
import { indexExtension, selectWand } from "../src/vision/indexExtension";
import type { Hand } from "../src/types/theremin";

function pose(directions: number[]) {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  directions.forEach((degrees, i) => {
    const radians = (degrees * Math.PI) / 180;
    const length = [0.045, 0.025, 0.018][i];
    points[i + 6] = {
      x: points[i + 5].x + Math.cos(radians) * length,
      y: points[i + 5].y + Math.sin(radians) * length,
      z: 0,
    };
  });
  return points;
}

it("accepts relaxed extension, including a slightly curved fingertip, at all 3D orientations", () => {
  for (const directions of [
    [0, 0, 0],
    [0, 30, 45],
    [0, 0, 40],
    [0, -25, -35],
  ]) {
    const points = pose(directions);
    for (let angle = 0; angle < 360; angle += 15) {
      const a = (angle * Math.PI) / 180;
      const rotated = points.map((p) => ({
        x: 2 + p.x * Math.cos(a),
        y: 1 + p.y,
        z: 3 + p.x * Math.sin(a),
      }));
      expect(indexExtension(rotated)).toBeGreaterThanOrEqual(0.93);
      expect(indexExtension(rotated)).toBeCloseTo(indexExtension(points));
    }
  }
});

it("rejects bent and hooked fingers and invalid or collapsed landmarks", () => {
  for (const directions of [
    [0, 90, 180],
    [0, 90, 90],
    [0, 0, 100],
    [0, 60, 120],
  ])
    expect(indexExtension(pose(directions))).toBeLessThan(0.9);
  for (const invalid of [NaN, Infinity]) {
    const points = pose([0, 0, 0]);
    points[7].z = invalid;
    expect(indexExtension(points)).toBe(0);
  }
  const collapsed = pose([0, 0, 0]);
  collapsed[8] = collapsed[7];
  expect(indexExtension(collapsed)).toBe(0);
});

function hand(x: number, extension: number): Hand {
  return {
    point: { x, y: 0.5 },
    label: "Left",
    score: 0.5,
    landmarks: pose([0, 0, 0]).map((p) => ({ x: p.x + x, y: p.y + 0.5 })),
    indexExtension: extension,
  };
}

it("holds a marginal active pose without activating another marginal hand", () => {
  const active = hand(0.2, 1),
    marginal = hand(0.21, 0.915);
  expect(selectWand([marginal])).toBeUndefined();
  expect(selectWand([marginal], active)).toBe(marginal);
  expect(selectWand([hand(0.8, 0.915)], active)).toBeUndefined();
  expect(selectWand([hand(0.21, 0.89)], active)).toBeUndefined();
  const other = hand(0.8, 1);
  expect(selectWand([other, marginal], active)).toBe(marginal);
});
