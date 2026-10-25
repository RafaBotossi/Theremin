import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SongPanel } from "../src/components/SongPanel";
import { defaults } from "../src/types/theremin";
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("conta três segundos, destaca notas, pausa e encerra o guia", () => {
  const onGuide = vi.fn(),
    onSettings = vi.fn();
  render(
    <SongPanel
      settings={defaults}
      blocked={false}
      running={false}
      onGuide={onGuide}
      onSettings={onSettings}
    />,
  );
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar guia" }));
  expect(onSettings.mock.calls[0][0]).toMatchObject({
    pitchLeft: true,
    scale: "free",
  });
  act(() => vi.advanceTimersByTime(3100));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 69, next: 76 });
  act(() => vi.advanceTimersByTime(625));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 76, next: 79 });
  fireEvent.click(screen.getByRole("button", { name: "Pausar guia" }));
  const count = onGuide.mock.calls.length;
  act(() => vi.advanceTimersByTime(2000));
  expect(onGuide.mock.calls.length).toBe(count);
  fireEvent.click(screen.getByRole("button", { name: "Encerrar guia" }));
  expect(onGuide.mock.lastCall?.[0].active).toBe(false);
});
it("conclui sem repetir e pausa ao mutar", () => {
  const onGuide = vi.fn(),
    onSettings = vi.fn();
  const view = render(
    <SongPanel
      settings={defaults}
      blocked={false}
      running={true}
      onGuide={onGuide}
      onSettings={onSettings}
    />,
  );
  fireEvent.click(screen.getByLabelText("Repetir trecho"));
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar guia" }));
  act(() => vi.advanceTimersByTime(14000));
  expect(onGuide.mock.lastCall?.[0].cue).toBe("Trecho concluído");
  fireEvent.click(screen.getByRole("button", { name: "Iniciar guia" }));
  view.rerender(
    <SongPanel
      settings={defaults}
      blocked={true}
      running={true}
      onGuide={onGuide}
      onSettings={onSettings}
    />,
  );
  expect(screen.getByRole("button", { name: "Retomar guia" })).toBeDisabled();
});
it("0% fixa o primeiro alvo sem infinito e 1% avança lentamente", () => {
  const onGuide = vi.fn();
  render(
    <SongPanel
      settings={defaults}
      blocked={false}
      running={false}
      onGuide={onGuide}
      onSettings={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByLabelText("Velocidade (%)"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar guia" }));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({
    current: 69,
    remaining: null,
  });
  act(() => vi.advanceTimersByTime(10000));
  expect(onGuide.mock.lastCall?.[0].current).toBe(69);
  fireEvent.change(screen.getByLabelText("Velocidade (%)"), {
    target: { value: "1" },
  });
  act(() => vi.advanceTimersByTime(1000));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 69 });
  expect(onGuide.mock.lastCall?.[0].remaining).toBeGreaterThan(60);
});
