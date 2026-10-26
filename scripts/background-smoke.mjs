import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
// Reference image: https://storage.googleapis.com/mediapipe-assets/segmentation_input_rotation0.jpg
const photo = await readFile(
  process.env.TEST_PERSON_IMAGE || "test-results/person.jpg",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/test-person.jpg", (route) =>
    route.fulfill({ contentType: "image/jpeg", body: photo }),
  );
  await page.addInitScript(() => {
    localStorage.clear();
    navigator.mediaDevices.getUserMedia = async () => {
      const img = new Image();
      img.src = "/test-person.jpg";
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 512, 512);
      const timer = setInterval(() => ctx.drawImage(img, 0, 0, 512, 512), 33);
      const stream = canvas.captureStream(30);
      window.testCamera = stream;
      stream
        .getTracks()[0]
        .addEventListener("ended", () => clearInterval(timer));
      return stream;
    };
  });
  await page.goto(process.env.TEST_URL || "http://localhost:5173/");
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.locator(".camera-stage.live").waitFor();
  await page.getByRole("button", { name: "♫ Fundo", exact: true }).click();
  const background = page.locator(
    'canvas[data-musical-background][data-ready="true"]',
  );
  await background.waitFor();
  await mkdir("test-results", { recursive: true });
  await page
    .locator(".camera-stage")
    .screenshot({ path: "test-results/musical-background.png" });
  const pixels = await background.evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    const raw = document.createElement("canvas");
    raw.width = canvas.width;
    raw.height = canvas.height;
    const rc = raw.getContext("2d");
    rc.translate(raw.width, 0);
    rc.scale(-1, 1);
    const size = Math.min(raw.width, raw.height);
    rc.drawImage(
      document.querySelector("video"),
      (raw.width - size) / 2,
      (raw.height - size) / 2,
      size,
      size,
    );
    const diff = (x, y) => {
      const a = ctx.getImageData(
        x * canvas.width,
        y * canvas.height,
        1,
        1,
      ).data;
      const b = rc.getImageData(x * canvas.width, y * canvas.height, 1, 1).data;
      return Array.from(a)
        .slice(0, 3)
        .reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);
    };
    return {
      backgroundPixel: Array.from(
        ctx.getImageData(canvas.width * 0.05, canvas.height * 0.5, 1, 1).data,
      ),
      backgroundDifference: diff(0.05, 0.05),
      faceDifference: diff(
        ((raw.width - size) / 2 + size * 0.64) / raw.width,
        ((raw.height - size) / 2 + size * 0.25) / raw.height,
      ),
    };
  });
  if (pixels.backgroundDifference < 40 || pixels.faceDifference > 40)
    throw Error(JSON.stringify(pixels));
  await page.getByRole("button", { name: "Gravar", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Encerrar gravação" }).click();
  await page.locator("a.download").waitFor();
  const playback = await page.evaluate(async () => {
    const v = document.createElement("video");
    v.src = document.querySelector("a.download").href;
    v.muted = true;
    await v.play();
    await new Promise((r) => setTimeout(r, 400));
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0);
    const p = Array.from(
      ctx.getImageData(c.width * 0.05, c.height * 0.5, 1, 1).data,
    );
    v.pause();
    return { width: v.videoWidth, height: v.videoHeight, pixel: p };
  });
  if (!playback.width || playback.pixel[3] !== 255)
    throw Error("Filtered recording failed");
  if (
    playback.pixel
      .slice(0, 3)
      .some((v, i) => Math.abs(v - pixels.backgroundPixel[i]) > 15)
  )
    throw Error("MP4 did not preserve the musical background");
  await page.getByRole("button", { name: "♫ Fundo", exact: true }).click();
  if (await page.locator("[data-musical-background]").count())
    throw Error("Filter did not stop");
  if (
    !(await page.evaluate(
      () => window.testCamera.getTracks()[0].readyState === "live",
    ))
  )
    throw Error("Filter stopped the camera");
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    )
  )
    throw Error("Mobile overflow");
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  if (errors.length) throw Error(errors.join("\n"));
  console.log({ pixels, playback, errors });
} finally {
  await browser.close();
}
