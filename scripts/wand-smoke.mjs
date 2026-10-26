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
    window.hands = [
      { x: 0.5, y: 0.5, label: "Left", straight: true, depth: 1 },
      {
        x: 0.8,
        y: 0.5,
        label: "Right",
        straight: true,
        depth: 1,
        palmOpen: true,
      },
    ];
    window.contexts = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.contexts.push(this);
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
      body: `export class HandTracker {delegate='SIMULATED';static async create(){return new HandTracker()}close(){}detect(){return window.hands.map(h=>{const p=Array.from({length:21},()=>({x:h.x+.1,y:h.y+.2}));for(let i=5;i<=8;i++)p[i]={x:h.x,y:h.y+(8-i)*.04};if(!h.straight)p[8]={...p[6]};return {point:{x:h.x,y:h.y},landmarks:p,label:h.label,score:1,approach:h.depth,palmOpen:h.palmOpen};});}}`,
    }),
  );
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  if (await page.locator(".volume-antenna").count())
    throw Error("Circular antenna still shown");
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.locator(".camera-stage.live").waitFor();
  await page.waitForFunction(
    () => document.querySelector("meter").value > 0.01,
  );
  await page.evaluate(() => {
    window.measure = (c) => {
      const a = c.createAnalyser();
      a.fftSize = 4096;
      c.createMediaStreamSource(c.output.stream).connect(a);
      const g = c.createGain();
      g.gain.value = 0;
      a.connect(g).connect(c.destination);
      return () => {
        const samples = new Float32Array(4096);
        a.getFloatTimeDomainData(samples);
        const cross = [];
        for (let i = 1; i < samples.length; i++)
          if (samples[i - 1] < 0 && samples[i] >= 0)
            cross.push(i - 1 - samples[i - 1] / (samples[i] - samples[i - 1]));
        return {
          peak: Math.max(...samples.map(Math.abs)),
          frequency:
            cross.length > 2
              ? (c.sampleRate * (cross.length - 1)) / (cross.at(-1) - cross[0])
              : 0,
        };
      };
    };
    window.manual = window.measure(window.contexts[0]);
    window.level = () => window.manual().peak;
  });

  await page.waitForTimeout(500);
  if ((await page.evaluate(() => window.level())) > 0.001)
    throw Error("Neutral hand played before approach");
  await page.evaluate(() => {
    window.hands[0].depth = 1.3;
  });
  await page.waitForFunction(() => window.level() > 0.001);
  const held = await page.locator("meter").evaluate((e) => e.value);
  const palm = await page.evaluate(() => window.hands.pop());
  await page.waitForTimeout(1000);
  if ((await page.evaluate(() => window.level())) < 0.001)
    throw Error("Removing palm muted held note");
  if (
    Math.abs((await page.locator("meter").evaluate((e) => e.value)) - held) >
    0.002
  )
    throw Error("Volume drifted");
  await page.evaluate(() => {
    window.hands[0].depth = 1;
  });
  await page.waitForFunction(() => window.level() < 0.0001);
  await page.evaluate((h) => {
    h.palmOpen = false;
    window.hands.push(h);
  }, palm);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.hands[1].depth = 1.3;
  });
  await page.waitForFunction(() => window.level() > 0.001);
  await page.evaluate(() => window.hands.reverse());
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => window.level())) < 0.001)
    throw Error("Detector reorder muted active finger");
  await page.evaluate(() => {
    window.hands[0].depth = 1;
  });
  await page.waitForFunction(() => window.level() < 0.0001);
  // The other palm can now set volume; no left/right assignment is used.
  await page.evaluate(() => {
    window.hands[1].palmOpen = true;
    window.hands[1].y = 0.2;
  });
  await page.waitForFunction(
    (v) => document.querySelector("meter").value > v,
    held,
  );
  await page.waitForTimeout(800);
  const setVolume = await page.locator("meter").evaluate((e) => e.value);
  await page.evaluate(() => {
    window.hands = [];
  });
  await page.waitForFunction(() => window.level() < 0.0001);
  await page.waitForTimeout(600);
  if (
    Math.abs(
      (await page.locator("meter").evaluate((e) => e.value)) - setVolume,
    ) > 0.002
  )
    throw Error("Volume was not latched");
  if (await page.locator(".hand-swap").count())
    throw Error("Hand inversion still visible");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/depth-touch-desktop.png" });
  const report = {
    approachPlays: true,
    retreatSilences: true,
    eitherIndex: true,
    eitherPalm: true,
    latchedVolume: true,
    errors,
  };
  await writeFile(
    "test-results/wand-report.json",
    JSON.stringify(report, null, 2),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(report);
} finally {
  await browser.close();
}
