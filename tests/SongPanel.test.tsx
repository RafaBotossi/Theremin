import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SongPanel } from "../src/components/SongPanel";
import { defaults, emptyReading } from "../src/types/theremin";
beforeEach(() => vi.useFakeTimers());
it("selects a starting note, toggles advanced options and scopes Easy to the active target", () => {
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
  expect(screen.getByLabelText("Nível")).toHaveValue("easy");
  expect(screen.getByRole("button", { name: "Easy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByLabelText("Transpor")).not.toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Configurações avançadas" }),
  );
  expect(screen.getByLabelText("Transpor")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Configurações avançadas" }),
  );
  expect(screen.getByLabelText("Transpor")).not.toBeVisible();
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Acertar para avançar" }));
  fireEvent.click(screen.getByRole("button", { name: "Easy" }));
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({
    current: 64,
    easyTarget: 64,
  });
  fireEvent.click(screen.getByRole("button", { name: "Normal" }));
  expect(onGuide.mock.lastCall?.[0].easyTarget).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "PARAR" }));
  expect(onGuide.mock.lastCall?.[0].active).toBe(false);
});
it("freezes rising notes at zero speed during the countdown", () => {
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
  fireEvent.change(screen.getByLabelText("Velocidade (%)"), {
    target: { value: "25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  act(() => vi.advanceTimersByTime(1000));
  const notes = onGuide.mock.lastCall?.[0].falling;
  fireEvent.change(screen.getByLabelText("Velocidade (%)"), {
    target: { value: "0" },
  });
  act(() => vi.advanceTimersByTime(5000));
  expect(onGuide.mock.lastCall?.[0].falling).toEqual(notes);
});
it("nota por nota aguarda acerto e não revela o próximo alvo", () => {
  const onGuide = vi.fn(),
    onSettings = vi.fn();
  const props = {
    settings: defaults,
    blocked: false,
    running: true,
    onGuide,
    onSettings,
  };
  const view = render(<SongPanel {...props} reading={emptyReading} />);
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Acertar para avançar" }));
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  act(() => vi.advanceTimersByTime(20000));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 60, next: null });
  for (let i = 0; i < 5; i++) {
    act(() => vi.advanceTimersByTime(100));
    view.rerender(
      <SongPanel
        {...props}
        reading={{
          ...emptyReading,
          pitch: true,
          volume: true,
          gain: 0.1,
          frequency: 440 * 2 ** ((60 - 69) / 12),
        }}
      />,
    );
  }
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 62, next: null });
  const nextReading = {
    ...emptyReading,
    pitch: true,
    volume: true,
    gain: 0.1,
    frequency: 440 * 2 ** ((62 - 69) / 12),
  };
  for (let i = 0; i < 10; i++) {
    act(() => vi.advanceTimersByTime(100));
    view.rerender(<SongPanel {...props} reading={{ ...nextReading }} />);
  }
  expect(onGuide.mock.lastCall?.[0].current).toBe(62);
  view.rerender(<SongPanel {...props} reading={emptyReading} />);
  for (let i = 0; i < 5; i++) {
    act(() => vi.advanceTimersByTime(100));
    view.rerender(<SongPanel {...props} reading={{ ...nextReading }} />);
  }
  expect(onGuide.mock.lastCall?.[0].current).toBe(64);
  act(() => vi.advanceTimersByTime(20000));
  expect(onGuide.mock.lastCall?.[0].current).toBe(64);
  view.rerender(
    <SongPanel
      {...props}
      blocked
      reading={{
        ...emptyReading,
        pitch: true,
        volume: true,
        gain: 0.1,
        frequency: 440 * 2 ** ((62 - 69) / 12),
      }}
    />,
  );
  expect(screen.getByRole("button", { name: "INICIAR" })).toBeDisabled();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("shows a perfect result after the final practice note and clears it on restart", () => {
  const props = {
    settings: defaults,
    blocked: false,
    running: true,
    onGuide: vi.fn(),
    onSettings: vi.fn(),
  };
  const view = render(<SongPanel {...props} reading={emptyReading} />);
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Acertar para avançar" }));
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  for (let i = 0; i < 5; i++) {
    act(() => vi.advanceTimersByTime(100));
    view.rerender(
      <SongPanel
        {...props}
        reading={{
          ...emptyReading,
          pitch: true,
          volume: true,
          gain: 0.1,
          frequency: 440 * 2 ** ((60 - 69) / 12),
          attack: 1,
        }}
      />,
    );
  }
  expect(screen.getByText(/Excelente!/)).toBeVisible();
  expect(screen.getByText(/100% de acerto/)).toHaveTextContent(
    "1 acerto · 0 erros",
  );
  fireEvent.click(screen.getByRole("button", { name: "Fechar resultado" }));
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  expect(screen.queryByText(/Excelente!/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Pontuação")).toHaveTextContent("0 acertos");
});
it("does not grade a camera-free preview", () => {
  render(
    <SongPanel
      settings={defaults}
      blocked={false}
      running={false}
      onGuide={vi.fn()}
      onSettings={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  act(() => vi.advanceTimersByTime(20000));
  expect(screen.queryByLabelText("Pontuação")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Fechar resultado" }),
  ).not.toBeInTheDocument();
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
  fireEvent.change(screen.getByLabelText("Nível"), {
    target: { value: "hard" },
  });
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  expect(onSettings.mock.calls[0][0]).toMatchObject({
    pitchLeft: false,
    scale: "free",
  });
  act(() => vi.advanceTimersByTime(3100));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 69, next: null });
  act(() => vi.advanceTimersByTime(625));
  expect(onGuide.mock.lastCall?.[0]).toMatchObject({ current: 76, next: null });
  fireEvent.click(screen.getByRole("button", { name: "PAUSAR" }));
  const count = onGuide.mock.calls.length;
  act(() => vi.advanceTimersByTime(2000));
  expect(onGuide.mock.calls.length).toBe(count);
  fireEvent.click(screen.getByRole("button", { name: "PARAR" }));
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
  expect(screen.getByLabelText("Repetir trecho")).not.toBeChecked();
  fireEvent.change(screen.getByLabelText("Música"), {
    target: { value: "demo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  act(() => vi.advanceTimersByTime(14000));
  expect(onGuide.mock.lastCall?.[0].cue).toBe("Trecho concluído");
  expect(screen.getByText(/Ainda precisa praticar/)).toBeVisible();
  expect(screen.getByText(/0% de acerto/)).toHaveTextContent(
    "0 acertos · 8 erros",
  );
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
  view.rerender(
    <SongPanel
      settings={defaults}
      blocked={true}
      running={true}
      onGuide={onGuide}
      onSettings={onSettings}
    />,
  );
  expect(screen.getByRole("button", { name: "INICIAR" })).toBeDisabled();
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
  fireEvent.change(screen.getByLabelText("Nível"), {
    target: { value: "hard" },
  });
  fireEvent.change(screen.getByLabelText("Começar em"), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByLabelText("Velocidade (%)"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "INICIAR" }));
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
