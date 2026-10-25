import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.contexts = [];
    window.cameraRequests = 0;
    const media = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = (...a) => {
      window.cameraRequests++;
      return media(...a);
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...a) {
        super(...a);
        window.contexts.push(this);
      }
      createMediaStreamDestination() {
        const out = super.createMediaStreamDestination();
        window.output = out;
        return out;
      }
    };
  });
  await page.goto("http://localhost:5173/");
  if (await page.evaluate(() => window.contexts.length))
    throw Error("Audio before click");
  await page
    .getByRole("combobox", { name: "Música", exact: true })
    .selectOption("demo");
  await page.getByLabel("Repetir trecho").uncheck();
  await page
    .getByRole("button", { name: "♪ Ouvir música", exact: true })
    .click();
  await page.getByRole("button", { name: "Desligar som automático" }).waitFor();
  await page.evaluate(() => {
    const c = window.contexts[0],
      analyser = c.createAnalyser();
    analyser.fftSize = 2048;
    const g = c.createGain();
    g.gain.value = 0;
    c.createMediaStreamSource(window.output.stream)
      .connect(analyser)
      .connect(g)
      .connect(c.destination);
    window.level = () => {
      const a = new Float32Array(2048);
      analyser.getFloatTimeDomainData(a);
      return Math.max(...a.map(Math.abs));
    };
  });
  await page.waitForFunction(
    () => window.level() > 0.001,
    {},
    { timeout: 8000 },
  );
  await page.getByLabel("Velocidade (%)", { exact: true }).fill("0");
  await page.waitForFunction(() => window.level() < 0.0001);
  const frozen = await page
    .getByRole("progressbar", { name: "Progresso da música" })
    .getAttribute("value");
  await page.waitForTimeout(400);
  if (
    (await page
      .getByRole("progressbar", { name: "Progresso da música" })
      .getAttribute("value")) !== frozen
  )
    throw Error("Zero speed advances");
  await page.getByLabel("Velocidade (%)", { exact: true }).fill("1");
  await page.waitForFunction(() => window.level() > 0.001);
  await page.getByRole("button", { name: "Pausar guia", exact: true }).click();
  await page.waitForFunction(() => window.level() < 0.0001);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/song-audio-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Velocidade (%)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Retomar guia", exact: true }).click();
  await page
    .locator(".song-status")
    .filter({ hasText: "Trecho concluído" })
    .waitFor({ timeout: 16000 });
  await page.waitForFunction(() =>
    window.contexts.every((c) => c.state === "closed"),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/song-audio-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  if (errors.length || (await page.evaluate(() => window.cameraRequests)))
    throw Error(JSON.stringify(errors));
  const result = {
    realAudio: true,
    zeroSpeedSilent: true,
    onePercent: true,
    pauseSilent: true,
    autoClose: true,
    cameraRequests: 0,
    errors,
  };
  await writeFile(
    "test-results/song-audio-report.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
