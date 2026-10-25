import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CalibrationWizard } from "../src/components/CalibrationWizard";
import { defaults, type Hand } from "../src/types/theremin";

const hand = (x: number, y: number): Hand => ({
  point: { x, y },
  label: "Left",
  score: 0.55,
  landmarks: [],
});
beforeEach(() => vi.useFakeTimers());
it("calibra ambas as funções com um único indicador e pausa se dobrado", () => {
  const s = setup("wand");
  const h = hand(0.9, 0.9);
  h.landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  h.indexExtension = 1;
  s.hands.current = [h];
  s.frames(2000);
  s.frames(3000);
  h.indexExtension = 0;
  s.frames(7000);
  expect(s.onSave).not.toHaveBeenCalled();
  h.indexExtension = 1;
  s.frames(6000, (i) => {
    h.landmarks[8] = { x: i % 2 ? 0.7 : 0.3, y: 0.5 };
  });
  s.frames(3000);
  s.frames(6000, (i) => {
    h.landmarks[8].y = i % 2 ? 0.8 : 0.2;
  });
  expect(s.onSave).toHaveBeenCalledOnce();
  expect(s.onSave.mock.calls[0][0]).toMatchObject({
    controlMode: "wand",
    pitchMin: 0.3,
    pitchMax: 0.7,
    volumeMin: 0.2,
    volumeMax: 0.8,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function setup(controlMode: "screen" | "antennas" | "wand" = "screen") {
  const hands = { current: [hand(0.25, 0.5), hand(0.75, 0.5)] };
  const frameTime = { current: performance.now() };
  const onSave = vi.fn(),
    onClose = vi.fn();
  const view = render(
    <CalibrationWizard
      hands={hands}
      frameTime={frameTime}
      settings={{ ...defaults, controlMode, pitchLeft: false }}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  function frames(ms: number, move?: (index: number) => void) {
    for (let i = 0; i < ms / 100; i++) {
      act(() => {
        move?.(i);
        frameTime.current = performance.now() + 100;
        vi.advanceTimersByTime(100);
      });
    }
  }
  return { hands, frameTime, onSave, onClose, view, frames };
}
it("conclui as três etapas e salva sem nenhum clique", () => {
  const s = setup();
  expect(
    screen.queryByRole("button", { name: "Continuar" }),
  ).not.toBeInTheDocument();
  s.frames(2000);
  expect(
    screen.getByRole("heading", { name: "Mova a mão de pitch ↔" }),
  ).toBeInTheDocument();
  s.frames(3000);
  s.frames(6000, (i) => {
    s.hands.current[1].point.x = i % 2 ? 0.85 : 0.55;
  });
  expect(
    screen.getByRole("heading", { name: "Mova a mão de volume ↕" }),
  ).toBeInTheDocument();
  s.frames(3000);
  s.frames(6000, (i) => {
    s.hands.current[0].point.y = i % 2 ? 0.8 : 0.2;
  });
  expect(s.onSave).toHaveBeenCalledOnce();
  expect(s.onSave.mock.calls[0][0]).toMatchObject({
    pitchMin: 0.55,
    pitchMax: 0.85,
    volumeMin: 0.2,
    volumeMax: 0.8,
  });
});
it("não avança com landmarks congelados ou mãos ausentes", () => {
  const s = setup();
  act(() => vi.advanceTimersByTime(5000));
  expect(
    screen.getByRole("heading", { name: "Mostre as duas mãos" }),
  ).toBeInTheDocument();
  s.hands.current = [];
  s.frames(3000);
  expect(s.onSave).not.toHaveBeenCalled();
});
it("reinicia postura neutra na perda das mãos e permite cancelar", () => {
  const s = setup();
  s.frames(1500);
  s.hands.current = [];
  s.frames(200);
  s.hands.current = [hand(0.25, 0.5), hand(0.75, 0.5)];
  s.frames(1000);
  expect(
    screen.getByRole("heading", { name: "Mostre as duas mãos" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(s.onClose).toHaveBeenCalledOnce();
  s.view.unmount();
  act(() => vi.advanceTimersByTime(30000));
  expect(s.onSave).not.toHaveBeenCalled();
});
it("não salva limites sem amplitude suficiente", () => {
  const s = setup();
  s.frames(2000);
  s.frames(9000);
  expect(
    screen.getByRole("heading", { name: "Mova a mão de pitch ↔" }),
  ).toBeInTheDocument();
  expect(s.onSave).not.toHaveBeenCalled();
});
it("calibra antenas com movimentos pequenos e salva o ponto de silêncio", () => {
  const s = setup("antennas");
  s.frames(2000);
  s.frames(3000);
  s.frames(6000, (i) => {
    s.hands.current[1].point.x = i % 2 ? 0.78 : 0.7;
  });
  s.frames(3000);
  s.frames(6000, (i) => {
    s.hands.current[0].point.y = i % 2 ? 0.75 : 0.55;
  });
  expect(s.onSave).toHaveBeenCalledOnce();
  const saved = s.onSave.mock.calls[0][0];
  expect(saved.antennaNear).toBeCloseTo(0.12);
  expect(saved.antennaFar).toBeCloseTo(0.2);
  expect(saved.antennaY).toBeCloseTo(0.75);
  expect(saved.volumeReach).toBeCloseTo(0.2);
});
