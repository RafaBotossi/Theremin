import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const camera = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("../src/hooks/useCamera", () => ({
  openCamera: camera.open,
  cameraError: (e: Error) => e.message,
}));
vi.mock("../src/audio/ThereminEngine", () => ({
  ThereminEngine: class {
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    silence = vi.fn();
    configure = vi.fn();
  },
}));
import { App } from "../src/app/App";
it("corrige configuração antiga e mantém régua na haste ao trocar lados", () => {
  localStorage.setItem(
    "air-theremin-settings",
    JSON.stringify({ pitchLeft: false, assignment: "anatomical" }),
  );
  const view = render(<App />);
  expect(view.container.querySelector(".volume-antenna")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
  expect(screen.getByLabelText("Modo de controle")).toHaveValue("wand");
  fireEvent.change(screen.getByLabelText("Modo de controle"), {
    target: { value: "antennas" },
  });
  const side = (selector: string) =>
    parseFloat(
      (view.container.querySelector(selector) as HTMLElement).style.left,
    );
  expect(side(".pitch-antenna")).toBeCloseTo(10);
  expect(side(".volume-antenna")).toBeCloseTo(65);
  for (const line of view.container.querySelectorAll<HTMLElement>(".note-line"))
    expect(parseFloat(line.style.left)).toBeLessThan(50);
  expect(screen.getByLabelText("Identificação das mãos")).toHaveValue(
    "anatomical",
  );
  fireEvent.click(
    screen.getByLabelText("Inverter mãos: direita na nota, esquerda no volume"),
  );
  expect(side(".pitch-antenna")).toBeCloseTo(90);
  for (const line of view.container.querySelectorAll<HTMLElement>(".note-line"))
    expect(parseFloat(line.style.left)).toBeGreaterThan(50);
  view.unmount();
  const restored = render(<App />);
  expect(
    parseFloat(
      (restored.container.querySelector(".pitch-antenna") as HTMLElement).style
        .left,
    ),
  ).toBeCloseTo(90);
});
it("libera uma câmera concedida depois de cancelar a inicialização", async () => {
  let resolveCamera: (stream: MediaStream) => void = () => {};
  camera.open.mockReturnValue(
    new Promise<MediaStream>((resolve) => {
      resolveCamera = resolve;
    }),
  );
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Iniciar câmera e áudio" }),
  );
  await vi.waitFor(() => expect(camera.open).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Parar" }));
  const stop = vi.fn();
  resolveCamera({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
  expect(
    screen.getByRole("button", { name: "Iniciar câmera e áudio" }),
  ).toBeEnabled();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
it("aguarda gesto antes de solicitar câmera", () => {
  render(<App />);
  expect(camera.open).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Iniciar câmera e áudio" }),
  ).toBeEnabled();
  expect(screen.getByRole("button", { name: "Parar" })).toBeDisabled();
});
it("exibe erro de permissão e permite nova tentativa", async () => {
  camera.open.mockRejectedValue(new Error("Permissão de câmera negada"));
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Iniciar câmera e áudio" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Permissão de câmera negada",
  );
  expect(
    screen.getByRole("button", { name: "Iniciar câmera e áudio" }),
  ).toBeEnabled();
});
it("expõe configuração manual e persiste somente parâmetros", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
  fireEvent.change(screen.getByLabelText("Modo de controle"), {
    target: { value: "antennas" },
  });
  fireEvent.click(
    screen.getByLabelText("Inverter mãos: direita na nota, esquerda no volume"),
  );
  expect(
    JSON.parse(localStorage.getItem("air-theremin-settings")!).pitchLeft,
  ).toBe(false);
  expect(screen.getByLabelText("Identificação das mãos")).toBeVisible();
});
