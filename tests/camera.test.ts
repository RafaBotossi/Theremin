import { afterEach, expect, it, vi } from "vitest";
import { openCamera, cameraError } from "../src/hooks/useCamera";
afterEach(() => vi.unstubAllGlobals());
it("não solicita microfone e usa fallback de resolução", async () => {
  const getUserMedia = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("", "OverconstrainedError"))
    .mockResolvedValueOnce({});
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  await openCamera();
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(getUserMedia.mock.calls[0][0].audio).toBe(false);
  expect(getUserMedia.mock.calls[1][0].video.width.ideal).toBe(640);
});
it("não insiste após permissão negada", async () => {
  const error = new DOMException("", "NotAllowedError");
  const getUserMedia = vi.fn().mockRejectedValue(error);
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  await expect(openCamera()).rejects.toBe(error);
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(cameraError(error)).toContain("negada");
});
