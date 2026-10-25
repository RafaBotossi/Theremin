import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  silence: vi.fn(),
  configure: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../src/audio/ThereminEngine", () => ({
  ThereminEngine: class {
    resume = calls.resume;
    close = calls.close;
    silence = calls.silence;
    configure = calls.configure;
    update = calls.update;
  },
}));
import { useSongPlayback } from "../src/hooks/useSongPlayback";
import { defaults } from "../src/types/theremin";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("toca a nota do guia e silencia em 0%, pausa, e encerra no bloqueio", async () => {
  const note = { midi: 69, start: 0, duration: 1 };
  const { result, rerender } = renderHook(
    ({ speed, playing, blocked }) =>
      useSongPlayback(defaults, note, 0.5, playing, speed, blocked),
    { initialProps: { speed: 1, playing: true, blocked: false } },
  );
  expect(calls.resume).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.listen();
  });
  expect(calls.update.mock.lastCall?.[0]).toBe(440);
  expect(calls.update.mock.lastCall?.[1]).toBeGreaterThan(0);
  rerender({ speed: 0, playing: true, blocked: false });
  expect(calls.silence).toHaveBeenCalled();
  calls.silence.mockClear();
  rerender({ speed: 1, playing: false, blocked: false });
  expect(calls.silence).toHaveBeenCalled();
  rerender({ speed: 1, playing: false, blocked: true });
  expect(calls.close).toHaveBeenCalledOnce();
  expect(result.current.listening).toBe(false);
});
