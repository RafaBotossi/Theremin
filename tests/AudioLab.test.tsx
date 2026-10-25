import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { defaults } from "../src/types/theremin";
const calls = vi.hoisted(() => ({
  construct: vi.fn(),
  resume: vi.fn().mockResolvedValue(undefined),
  configure: vi.fn(),
  update: vi.fn(),
  close: vi.fn(),
  silence: vi.fn(),
}));
vi.mock("../src/audio/ThereminEngine", () => ({
  ThereminEngine: class {
    healthy = true;
    constructor() {
      calls.construct();
    }
    resume = calls.resume;
    configure = calls.configure;
    update = calls.update;
    close = calls.close;
    silence = calls.silence;
  },
}));
import { AudioLab } from "../src/components/AudioLab";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("requires activation, supports keyboard legato and releases vibrato and audio", async () => {
  vi.useFakeTimers();
  const view = render(
    <AudioLab settings={defaults} onSettings={vi.fn()} onBack={vi.fn()} />,
  );
  expect(calls.construct).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "a" });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Ativar áudio" }));
  });
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[1]).toBe(0);
  fireEvent.keyDown(window, { key: "a" });
  fireEvent.keyDown(window, { key: "s" });
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[0]).toBeCloseTo(293.6648);
  fireEvent.keyUp(window, { key: "s" });
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[0]).toBeCloseTo(261.6256);
  fireEvent.keyDown(window, { key: "v" });
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[4]).toBe(1);
  fireEvent.keyUp(window, { key: "v" });
  fireEvent.keyUp(window, { key: "a" });
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[1]).toBe(0);
  expect(calls.update.mock.lastCall?.[4]).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Sustentar nota" }));
  fireEvent.blur(window);
  act(() => vi.advanceTimersByTime(25));
  expect(calls.update.mock.lastCall?.[1]).toBe(0);
  view.unmount();
  expect(calls.close).toHaveBeenCalledOnce();
});
