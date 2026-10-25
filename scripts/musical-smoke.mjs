import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.audioContexts = [];
    window.cameraRequests = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = (...args) => {
      window.cameraRequests++;
      return original(...args);
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.audioContexts.push(this);
      }
      createMediaStreamDestination() {
        const d = super.createMediaStreamDestination();
        window.output = d;
        return d;
      }
    };
  });
  await page.goto("http://localhost:5173/");
  if ((await page.evaluate(() => window.audioContexts.length)) !== 0)
    throw Error("Audio before gesture");
  await page.getByRole("button", { name: "♪ Ouvir exemplo" }).click();
  await page.getByRole("button", { name: "Parar exemplo" }).waitFor();
  await page.evaluate(() => {
    const c = window.audioContexts[0];
    window.analyser = c.createAnalyser();
    window.analyser.fftSize = 2048;
    const gain = c.createGain();
    gain.gain.value = 0;
    c.createMediaStreamSource(window.output.stream)
      .connect(window.analyser)
      .connect(gain)
      .connect(c.destination);
  });
  await page.waitForFunction(() => {
    const data = new Float32Array(2048);
    window.analyser.getFloatTimeDomainData(data);
    return data.some((x) => Math.abs(x) > 0.001);
  });
  await page
    .getByRole("button", { name: "♪ Ouvir exemplo" })
    .waitFor({ timeout: 10000 });
  await page.waitForFunction(() => window.audioContexts[0].state === "closed");
  await page.getByRole("button", { name: "Cordas", exact: true }).click();
  if (
    (await page.getByRole("combobox", { name: /^Timbre/ }).inputValue()) !==
    "strings"
  )
    throw Error("Preset not applied");
  await page.getByRole("button", { name: "♪ Ouvir exemplo" }).click();
  await page.getByRole("button", { name: "Parar exemplo" }).click();
  await page.waitForFunction(() =>
    window.audioContexts.every((c) => c.state === "closed"),
  );
  await page.getByRole("button", { name: "Melódico", exact: true }).click();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/musical-desktop.png",
    fullPage: true,
  });
  const cameraRequests = await page.evaluate(() => window.cameraRequests);
  if (cameraRequests) throw Error("Example requested camera");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.screenshot({
    path: "test-results/musical-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  if (errors.length) throw Error(errors.join("\n"));
  const result = {
    realAudio: true,
    autoStop: true,
    manualStop: true,
    presets: true,
    cameraRequests,
    errors,
  };
  console.log(result);
  await writeFile(
    "test-results/musical-report.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
