import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  PitchFeedback,
  pitchCorrection,
} from "../src/components/PitchFeedback";
import { emptyReading } from "../src/types/theremin";
afterEach(cleanup);
it("mostra correção positiva para nota grave e negativa para nota aguda", () => {
  expect(pitchCorrection(220, 69)).toBe(1200);
  expect(pitchCorrection(880, 69)).toBe(-1200);
  const view = render(
    <PitchFeedback
      reading={{ ...emptyReading, pitch: true, frequency: 220 }}
      target={69}
      running
      guideActive
      listening={false}
    />,
  );
  expect(screen.getByText(/Suba \+1200/)).toBeVisible();
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "-100");
  view.rerender(
    <PitchFeedback
      reading={{ ...emptyReading, pitch: true, frequency: 880 }}
      target={69}
      running
      guideActive
      listening={false}
    />,
  );
  expect(screen.getByText(/Desça −1200/)).toBeVisible();
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
});
it("não apresenta afinação falsa quando a mão some ou durante pausas", () => {
  const view = render(
    <PitchFeedback
      reading={emptyReading}
      target={69}
      running
      guideActive
      listening={false}
    />,
  );
  expect(screen.getByText(/Estique o indicador/)).toBeVisible();
  view.rerender(
    <PitchFeedback
      reading={{ ...emptyReading, pitch: true }}
      target={null}
      running
      guideActive
      listening={false}
    />,
  );
  expect(screen.getByText(/Sem nota-alvo/)).toBeVisible();
});
