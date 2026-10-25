import { afterEach, expect, it, vi } from "vitest";
import { ThereminEngine } from "../src/audio/ThereminEngine";
import { defaults } from "../src/types/theremin";
const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
});
function mockContext() {
  const node = () => ({
    connect: vi.fn(function (this: unknown) {
      return this;
    }),
    disconnect: vi.fn(),
  });
  const c = {
    currentTime: 10,
    sampleRate: 48000,
    state: "running",
    destination: node(),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({
      ...node(),
      frequency: param(),
      Q: param(),
      gain: param(),
    }),
    createConvolver: () => node(),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createDelay: () => ({ ...node(), delayTime: param() }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
    }),
    createMediaStreamDestination: () => node(),
  };
  const params = new Map(
    [
      "logFrequency",
      "gain",
      "glide",
      "vibratoRate",
      "vibratoDepth",
      "vibratoExpression",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
    ].map((k) => [k, param()]),
  );
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return c;
      }
    },
  );
  const worklet = vi.fn(function () {
    return { ...node(), parameters: params };
  });
  vi.stubGlobal("AudioWorkletNode", worklet);
  return { c, params, worklet };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("creates one continuous voice and limiter, clamps targets and schedules safety in audio time", async () => {
  const { c, params, worklet } = mockContext();
  const engine = new ThereminEngine();
  await engine.resume();
  expect(worklet).toHaveBeenCalledTimes(2);
  expect(c.audioWorklet.addModule).toHaveBeenCalledWith(
    "/audio/theremin-processor.js",
  );
  engine.update(9000, 1, 75);
  expect(params.get("logFrequency")!.setValueAtTime).toHaveBeenLastCalledWith(
    Math.log(4000),
    10,
  );
  expect(params.get("gain")!.setValueAtTime).toHaveBeenCalledWith(0.25, 10);
  expect(params.get("gain")!.setValueAtTime).toHaveBeenLastCalledWith(
    0,
    10.075,
  );
  expect(
    params.get("vibratoExpression")!.setValueAtTime,
  ).toHaveBeenLastCalledWith(0, 10);
  engine.update(220, 0.1, 150, 0.5, 1);
  engine.configure({ ...defaults, reverb: 0.5 });
  expect(worklet).toHaveBeenCalledTimes(2);
  engine.silence();
  expect(params.get("gain")!.setValueAtTime).toHaveBeenLastCalledWith(0, 10);
  expect(params.get("logFrequency")!.setValueAtTime).toHaveBeenLastCalledWith(
    Math.log(220),
    10,
  );
});
it("reports module failure and supports idempotent close during initialization", async () => {
  vi.useFakeTimers();
  const { c, worklet } = mockContext();
  let resolve: () => void = () => {};
  c.audioWorklet.addModule.mockReturnValue(
    new Promise<void>((r) => {
      resolve = r;
    }),
  );
  const engine = new ThereminEngine();
  const closing = engine.close();
  expect(engine.close()).toBe(closing);
  resolve();
  await vi.advanceTimersByTimeAsync(80);
  await closing;
  expect(c.close).toHaveBeenCalledOnce();
  expect(worklet).not.toHaveBeenCalled();
  c.audioWorklet.addModule.mockRejectedValue(new Error("module failed"));
  const other = new ThereminEngine();
  await expect(other.resume()).rejects.toThrow("module failed");
});
it("rejects autoplay suspension and smoothly mutes processor failure", async () => {
  const { c, worklet } = mockContext();
  c.state = "suspended";
  const engine = new ThereminEngine();
  await expect(engine.resume()).rejects.toThrow("Áudio bloqueado");
  c.state = "running";
  await engine.resume();
  expect(engine.healthy).toBe(true);
  worklet.mock.results[0].value.onprocessorerror();
  expect(engine.healthy).toBe(false);
});
