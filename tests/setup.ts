import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
HTMLCanvasElement.prototype.getContext = vi
  .fn()
  .mockReturnValue({ clearRect: vi.fn() });
