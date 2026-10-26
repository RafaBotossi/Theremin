import { chromium } from "@playwright/test";
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
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      "air-theremin-settings",
      JSON.stringify({
        handLayoutVersion: 4,
        controlMode: "wand",
        backgroundDefaultsVersion: 1,
        musicalBackground: false,
        waveform: "sine",
        brightness: 0.4,
        reverb: 0,
        delay: 0,
        scale: "free",
        vibrato: 0,
      }),
    );
    window.recordingBlobs = new Map();
    const createURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createURL(blob);
      window.recordingBlobs.set(url, blob);
      return url;
    };
    window.hands = [
      { x: 0.5, y: 0.5, label: "Left", straight: true, pinch: 0.8 },
      {
        x: 0.8,
        y: 0.5,
        label: "Right",
        straight: true,
        pinch: 0.8,
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
      body: `export class HandTracker {delegate='SIMULATED';static async create(){return new HandTracker()}close(){}detect(){return window.hands.map(h=>{const p=Array.from({length:21},()=>({x:h.x+.1,y:h.y+.2}));for(let i=5;i<=8;i++)p[i]={x:h.x,y:h.y+(8-i)*.04};if(!h.straight)p[8]={...p[6]};return {point:{x:h.x,y:h.y},landmarks:p,label:h.label,score:1,pinchRatio:h.pinch,palmOpen:h.palmOpen};});}}`,
    }),
  );
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  if (await page.locator(".volume-antenna").count())
    throw Error("Circular antenna still shown");
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.locator(".camera-stage.live").waitFor();
  if (process.env.TEST_BACKGROUND) {
    if (
      (await page
        .getByRole("button", { name: "♫ Fundo", exact: true })
        .getAttribute("aria-pressed")) !== "true"
    )
      await page.getByRole("button", { name: "♫ Fundo", exact: true }).click();
    await page
      .locator('canvas[data-musical-background][data-ready="true"]')
      .waitFor();
  }
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

  await page.evaluate(() => {
    window.hands = [
      { x: 0.32, y: 0.5, label: "Left", straight: true, pinch: 0.1 },
      { x: 0.61, y: 0.5, label: "Right", straight: true, pinch: 0.1 },
    ];
    const c = window.contexts[0],
      a = c.createAnalyser();
    a.fftSize = 32768;
    a.smoothingTimeConstant = 0;
    c.createMediaStreamSource(c.output.stream).connect(a);
    const g = c.createGain();
    g.gain.value = 0;
    a.connect(g).connect(c.destination);
    window.spectrum = () => {
      const data = new Float32Array(a.frequencyBinCount);
      a.getFloatFrequencyData(data);
      const db = (x) => {
        const f = 220 * 4 ** ((x - 0.15) / 0.7),
          k = Math.round((f / c.sampleRate) * a.fftSize);
        return Math.max(...data.slice(k - 2, k + 3));
      };
      return { a: db(0.32), b: db(0.61), peak: window.level() };
    };
  });
  await page.waitForTimeout(1600);
  const both = await page.evaluate(() => window.spectrum());
  if (both.a < -60 || both.b < -60 || both.peak >= 0.95)
    throw Error("Two audible clean pitches missing: " + JSON.stringify(both));
  if ((await page.locator(".pitch-cursor").count()) !== 2)
    throw Error("Missing second pitch cursor");
  await page.evaluate(() => {
    window.hands.reverse();
  });
  await page.waitForTimeout(500);
  const swapped = await page.evaluate(() => window.spectrum());
  if (Math.abs(swapped.a - both.a) > 3 || Math.abs(swapped.b - both.b) > 3)
    throw Error("Detection reorder changed voices");
  await page.evaluate(() => {
    window.hands.find((h) => h.label === "Right").pinch = 0.8;
  });
  await page.waitForTimeout(1500);
  const one = await page.evaluate(() => window.spectrum());
  if (one.a < -60 || one.b > one.a - 35)
    throw Error(
      "Opening one pinch did not silence only its voice: " +
        JSON.stringify(one),
    );
  await page.evaluate(() => {
    window.hands = [];
  });
  await page.waitForTimeout(1000);
  if ((await page.evaluate(() => window.level())) > 0.001)
    throw Error("Lost tracking left stuck voice");
  await page.locator(".song-level select").selectOption("hard");
  await page.locator(".song-selection select").selectOption("hobbits");
  await page.getByRole("button", { name: "Ouvir música" }).click();
  await page.waitForTimeout(4500);
  const reference = await page.evaluate(() =>
    window.measure(window.contexts.at(-1))(),
  );
  // A new analyser needs a frame to fill; verify the reference via the UI and fresh samples.
  await page.evaluate(() => {
    window.reference = window.measure(window.contexts.at(-1));
  });
  await page.waitForFunction(() => window.reference().peak > 0.001);
  const melody = await page.evaluate(() => window.reference());
  if (melody.peak < 0.001) throw Error("Hobbits reference is silent");
  await page.getByRole("button", { name: "PARAR", exact: true }).click();
  await page
    .getByRole("button", { name: "Acertar para avançar", exact: true })
    .click();
  await page.getByRole("button", { name: "INICIAR", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".song-status")?.textContent.includes("1/83"),
  );
  console.log({ both, swapped, one, melody, reference, errors });
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
