// Controlled landmarks exercise UI and real Web Audio without a physical user.
// Only the dev-server HandTracker module is replaced in this browser context.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    permissions: ["camera"],
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "air-theremin-settings",
      JSON.stringify({
        controlMode: "screen",
        pitchLeft: false,
        handLayoutVersion: 2,
      }),
    );
    window.testHands = [
      { x: 0.25, y: 0.8 },
      { x: 0.75, y: 0.5 },
    ];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.testAudio = this;
      }
      createMediaStreamDestination() {
        const destination = super.createMediaStreamDestination();
        window.testOutput = destination;
        return destination;
      }
    };
  });
  await page.route("**/src/vision/HandTracker.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export class HandTracker {delegate='SIMULATED';static async create(){return new HandTracker();} close(){} detect(){return window.testHands.map(p=>({point:p,label:'Left',score:.55,landmarks:Array.from({length:21},()=>p)}));}}`,
    }),
  );
  await page.goto(process.env.TEST_URL || "http://localhost:5173/");
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.getByText("● AO VIVO", { exact: true }).waitFor();
  const meter = page.getByRole("meter", { name: "Volume" });
  await page.waitForFunction(
    () => Number(document.querySelector("meter").value) > 0,
  );
  const low = await meter.evaluate((el) => el.value);
  await page.evaluate(() => {
    window.testHands[0].y = 0.2;
  });
  await page.waitForFunction(() => document.querySelector("meter").value > 0.1);
  const high = await meter.evaluate((el) => el.value);
  if (high <= low) throw Error("Volume did not rise");
  // Confirm a non-zero signal actually reaches the recording output.
  await page.evaluate(() => {
    const c = window.testAudio;
    const analyser = c.createAnalyser();
    analyser.fftSize = 2048;
    c.createMediaStreamSource(window.testOutput.stream).connect(analyser);
    const silent = c.createGain();
    silent.gain.value = 0;
    analyser.connect(silent).connect(c.destination);
    window.testAnalyser = analyser;
  });
  await page.waitForFunction(() => {
    const samples = new Float32Array(2048);
    window.testAnalyser.getFloatTimeDomainData(samples);
    return samples.some((v) => Math.abs(v) > 0.001);
  });
  const positions = [];
  for (const hands of [
    [
      { x: 0.25, y: 0.2 },
      { x: 0.75, y: 0.5 },
    ],
    [{ x: 0.75, y: 0.5 }],
    [{ x: 0.25, y: 0.2 }],
    [
      { x: 0.25, y: 0.01 },
      { x: 0.99, y: 0.5 },
    ],
    [],
  ]) {
    await page.evaluate((h) => {
      window.testHands = h;
    }, hands);
    await page.waitForTimeout(350);
    positions.push(
      await page
        .locator(".instructions")
        .evaluate((el) => el.getBoundingClientRect().top),
    );
  }
  if (Math.max(...positions) - Math.min(...positions) > 1)
    throw Error("Cards shifted: " + positions.join(","));
  await page.waitForFunction(() => document.querySelector("meter").value === 0);
  await page.getByRole("button", { name: "Calibrar", exact: true }).click();
  await page.evaluate(() => {
    window.testHands = [
      { x: 0.25, y: 0.5 },
      { x: 0.75, y: 0.5 },
    ];
  });
  await page
    .getByRole("heading", { name: "Mova a mão de pitch ↔" })
    .waitFor({ timeout: 10000 });
  await page.evaluate(() => {
    window.motion = setInterval(() => {
      window.testHands[1].x = window.testHands[1].x > 0.7 ? 0.55 : 0.85;
    }, 250);
  });
  await page
    .getByRole("heading", { name: "Mova a mão de volume ↕" })
    .waitFor({ timeout: 15000 });
  await page.evaluate(() => {
    clearInterval(window.motion);
    window.motion = setInterval(() => {
      window.testHands[0].y = window.testHands[0].y > 0.5 ? 0.2 : 0.8;
    }, 250);
  });
  await page
    .getByRole("region", { name: "Calibração guiada" })
    .waitFor({ state: "detached", timeout: 15000 });
  await page.evaluate(() => {
    clearInterval(window.motion);
    window.testHands[0].y = 0.2;
  });
  await page.waitForFunction(() => document.querySelector("meter").value > 0.1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("air-theremin-settings")),
  );
  if (saved.volumeMax - saved.volumeMin < 0.5)
    throw Error("Calibration limits missing");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/interaction-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.getByText("● AO VIVO", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Calibrar", exact: true }).click();
  await page.screenshot({
    path: "test-results/calibration-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  if (errors.length) throw Error(errors.join("\n"));
  const report = {
    result: "passed",
    low,
    high,
    realAudioSignal: true,
    cardPositions: positions,
    automaticCalibration: true,
    errors,
  };
  await writeFile(
    "test-results/interaction-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}
