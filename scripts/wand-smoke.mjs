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
    localStorage.clear();
    window.hands = [{ x: 0.5, y: 0.5, label: "Left", straight: true }];
    window.contexts = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        this.oscillators = [];
        window.contexts.push(this);
      }
      createOscillator() {
        const o = super.createOscillator();
        this.oscillators.push(o);
        return o;
      }
      createMediaStreamDestination() {
        const d = super.createMediaStreamDestination();
        this.output = d;
        return d;
      }
    };
  });
  await page.route("**/src/vision/HandTracker.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export class HandTracker {delegate='SIMULATED';static async create(){return new HandTracker()}close(){}detect(){return window.hands.map(h=>{const p=Array.from({length:21},()=>({x:h.x+.1,y:h.y+.2}));for(let i=5;i<=8;i++)p[i]={x:h.x,y:h.y+(8-i)*.04};if(!h.straight)p[8]={...p[6]};return {point:{x:.9,y:.9},landmarks:p,label:h.label,score:.55};});}}`,
    }),
  );
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  if (await page.locator(".volume-antenna").count())
    throw Error("Circular antenna still shown");
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.getByText("● AO VIVO", { exact: true }).waitFor();
  await page.waitForFunction(
    () => document.querySelector("meter").value > 0.01,
  );
  await page.evaluate(() => {
    const c = window.contexts[0],
      a = c.createAnalyser();
    a.fftSize = 2048;
    c.createMediaStreamSource(c.output.stream).connect(a);
    const g = c.createGain();
    g.gain.value = 0;
    a.connect(g).connect(c.destination);
    window.level = () => {
      const samples = new Float32Array(2048);
      a.getFloatTimeDomainData(samples);
      return Math.max(...samples.map(Math.abs));
    };
  });
  await page.waitForFunction(() => window.level() > 0.001);
  const volume = await page.locator("meter").evaluate((e) => e.value);
  await page.evaluate(() => {
    window.hands[0].y = 0.2;
  });
  await page.waitForFunction(
    (v) => document.querySelector("meter").value > v * 1.5,
    volume,
  );
  await page.evaluate(() => {
    window.hands[0].straight = false;
  });
  await page.waitForFunction(
    () =>
      window.level() < 0.0001 && document.querySelector("meter").value === 0,
  );
  await page.evaluate(() => {
    window.hands = [{ x: 0.5, y: 0.3, label: "Right", straight: true }];
  });
  await page.waitForFunction(() => window.level() > 0.001);
  await page
    .getByRole("combobox", { name: "Música", exact: true })
    .selectOption("demo");
  await page.getByLabel("Velocidade (%)", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Iniciar guia", exact: true }).click();
  const targetX = await page
    .locator(".song-target")
    .evaluate((e) => parseFloat(e.style.left) / 100);
  await page.evaluate((x) => {
    window.hands[0].x = x;
  }, targetX);
  await page.waitForFunction(
    () =>
      Math.abs(window.contexts[0].oscillators[0].frequency.value - 261.625565) <
      0.2,
  );
  const manualFrequency = await page.evaluate(
    () => window.contexts[0].oscillators[0].frequency.value,
  );
  await page
    .getByRole("button", { name: "Encerrar guia", exact: true })
    .click();
  await page.evaluate(() => {
    window.hands[0].x = 0.8;
  });
  await page
    .getByRole("button", { name: "Tocar nota por nota", exact: true })
    .click();
  await page.waitForTimeout(700);
  if ((await page.locator(".song-target span").textContent()) !== "Dó4")
    throw Error("Wrong note advanced");
  if (await page.locator(".song-next").count())
    throw Error("Future note leaked");
  await page.evaluate((x) => {
    window.hands[0].x = x;
  }, targetX);
  await page.waitForFunction(
    () => document.querySelector(".song-target span")?.textContent === "Ré4",
  );
  await page.evaluate(() => {
    window.hands[0].straight = false;
  });
  await page.waitForFunction(() => window.level() < 0.0001);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/wand-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Encerrar guia", exact: true })
    .click();
  await page.getByLabel("Velocidade (%)", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "♪ Ouvir música", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      window.contexts.length === 2 &&
      Math.abs(window.contexts[1].oscillators[0].frequency.value - 261.625565) <
        0.2,
    {},
    { timeout: 8000 },
  );
  const automaticFrequency = await page.evaluate(
    () => window.contexts[1].oscillators[0].frequency.value,
  );
  if (Math.abs(manualFrequency - automaticFrequency) > 0.4)
    throw Error("Different pitch for same note");
  await page.getByRole("button", { name: "Desligar som automático" }).click();
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/wand-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Overflow");
  if (errors.length) throw Error(errors.join("\n"));
  const report = {
    singleLeft: true,
    singleRight: true,
    foldedSilent: true,
    oneTarget: true,
    advanceOnMatch: true,
    manualFrequency,
    automaticFrequency,
    errors,
  };
  await writeFile(
    "test-results/wand-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}
