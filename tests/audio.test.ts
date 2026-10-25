import { afterEach, expect, it, vi } from "vitest";
import { ThereminEngine } from "../src/audio/ThereminEngine";
import { defaults } from "../src/types/theremin";
const param = () => ({
  value: 1,
  setTargetAtTime: vi.fn(),
  cancelAndHoldAtTime: vi.fn(),
});
function context() {
  const gains: { gain: ReturnType<typeof param> }[] = [];
  const oscillators: {
    frequency: ReturnType<typeof param>;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const node = () => ({
    connect: vi.fn(function (this: unknown) {
      return this;
    }),
  });
  const c = {
    currentTime: 10,
    sampleRate: 100,
    state: "running",
    destination: node(),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: () => {
      const n = { ...node(), gain: param() };
      gains.push(n);
      return n;
    },
    createOscillator: () => {
      const n = {
        ...node(),
        frequency: param(),
        detune: param(),
        start: vi.fn(),
        stop: vi.fn(),
        setPeriodicWave: vi.fn(),
      };
      oscillators.push(n);
      return n;
    },
    createBiquadFilter: () => ({ ...node(), frequency: param() }),
    createPeriodicWave: vi.fn().mockReturnValue({}),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      ratio: param(),
    }),
    createConvolver: () => node(),
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
    createDelay: () => ({ ...node(), delayTime: param() }),
    createMediaStreamDestination: () => node(),
  };
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return c;
      }
    },
  );
  return { c, gains, oscillators };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("começa silencioso, limita ganho e agenda fade independente de frames", () => {
  const { gains, oscillators } = context();
  const engine = new ThereminEngine();
  expect(gains[0].gain.value).toBe(0);
  expect(gains[1].gain.value).toBe(0);
  engine.update(9000, 1, 75);
  expect(oscillators[0].frequency.setTargetAtTime).toHaveBeenCalledWith(
    4000,
    10,
    0.018,
  );
  expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0.25, 10, 0.035);
  expect(gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(
    0,
    10.075,
    0.008,
  );
  engine.silence();
  expect(gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 10, 0.008);
});
it("encerra osciladores e contexto após fade", async () => {
  vi.useFakeTimers();
  const { c, oscillators } = context();
  const engine = new ThereminEngine();
  const closing = engine.close();
  expect(c.close).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(50);
  await closing;
  expect(c.close).toHaveBeenCalledOnce();
  expect(oscillators.every((o) => o.stop.mock.calls.length === 1)).toBe(true);
});
it("informa contexto bloqueado", async () => {
  const { c } = context();
  c.state = "suspended";
  const engine = new ThereminEngine();
  await expect(engine.resume()).rejects.toThrow("Áudio bloqueado");
});
it("cria onda harmônica normalizada e reutiliza-a ao mudar efeitos", () => {
  const { c } = context();
  const engine = new ThereminEngine();
  engine.configure(defaults);
  expect(c.createPeriodicWave).toHaveBeenCalledOnce();
  const coefficients = c.createPeriodicWave.mock.calls[0][1] as Float32Array;
  expect(coefficients[1]).toBe(1);
  expect(coefficients[2]).toBeGreaterThan(0);
  engine.configure({ ...defaults, reverb: 0.25 });
  expect(c.createPeriodicWave).toHaveBeenCalledOnce();
  engine.configure({ ...defaults, waveform: "strings" });
  expect(c.createPeriodicWave).toHaveBeenCalledTimes(2);
});
