import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), create: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: mocks.resolve },
  HandLandmarker: { createFromOptions: mocks.create },
}));
import { HandTracker } from "../src/vision/HandTracker";
afterEach(() => vi.resetAllMocks());
it("usa assets locais e tenta CPU após falha de GPU", async () => {
  mocks.resolve.mockResolvedValue({});
  const close = vi.fn();
  mocks.create
    .mockRejectedValueOnce(new Error("GPU unavailable"))
    .mockResolvedValueOnce({ close });
  const tracker = await HandTracker.create();
  expect(tracker.delegate).toBe("CPU");
  expect(mocks.resolve).toHaveBeenCalledWith(
    import.meta.env.BASE_URL + "mediapipe/wasm",
  );
  expect(mocks.create.mock.calls[0][1]).toMatchObject({
    runningMode: "VIDEO",
    numHands: 2,
    baseOptions: {
      delegate: "GPU",
      modelAssetPath:
        import.meta.env.BASE_URL + "mediapipe/hand_landmarker.task",
    },
  });
  expect(mocks.create.mock.calls[1][1].baseOptions.delegate).toBe("CPU");
  tracker.close();
  expect(close).toHaveBeenCalledOnce();
});
it("converte landmarks para as coordenadas do preview espelhado", async () => {
  mocks.resolve.mockResolvedValue({});
  const detectForVideo = vi.fn().mockReturnValue({
    landmarks: [Array.from({ length: 21 }, () => ({ x: 0.2, y: 0.7 }))],
    handedness: [[{ categoryName: "Left", score: 0.95 }]],
  });
  mocks.create.mockResolvedValue({ detectForVideo });
  const tracker = await HandTracker.create();
  const hands = tracker.detect({} as HTMLVideoElement, 123, "palm");
  expect(hands[0].point.x).toBeCloseTo(0.8);
  expect(hands[0].point.y).toBeCloseTo(0.7);
  expect(hands[0].landmarks[0].x).toBeCloseTo(0.8);
  expect(detectForVideo.mock.calls[0][1]).toBe(123);
});
it("propaga erro se nenhum delegate inicializa", async () => {
  mocks.resolve.mockResolvedValue({});
  mocks.create.mockRejectedValue(new Error("modelo inválido"));
  await expect(HandTracker.create()).rejects.toThrow("modelo inválido");
});
