import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || "chrome",
  headless: true,
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.contexts = [];
    window.worklets = [];
    window.cameraRequests = 0;
    const nativeMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = (...a) => {
      window.cameraRequests++;
      return nativeMedia(...a);
    };
    const Native = window.AudioContext,
      Worklet = window.AudioWorkletNode;
    window.AudioContext = class extends Native {
      constructor(...a) {
        super(...a);
        window.contexts.push(this);
      }
      createMediaStreamDestination() {
        const d = super.createMediaStreamDestination();
        this.output = d;
        return d;
      }
    };
    window.AudioWorkletNode = class extends Worklet {
      constructor(...a) {
        super(...a);
        window.worklets.push({ name: a[1], node: this });
      }
    };
  });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  await page
    .getByRole("button", { name: "Laboratório de áudio", exact: true })
    .click();
  if (await page.evaluate(() => window.contexts.length))
    throw Error("Context before gesture");
  await page.getByRole("button", { name: "Ativar áudio", exact: true }).click();
  await page
    .getByText("Áudio ativo · segure uma nota ou use Sustentar", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Pure", exact: true }).click();
  await page.evaluate(() => {
    const c = window.contexts[0],
      split = c.createChannelSplitter(2);
    c.createMediaStreamSource(c.output.stream).connect(split);
    const a = [c.createAnalyser(), c.createAnalyser()],
      g = c.createGain();
    g.gain.value = 0;
    a.forEach((n, i) => {
      n.fftSize = 16384;
      split.connect(n, i);
      n.connect(g);
    });
    g.connect(c.destination);
    window.sample = () => {
      const data = a.map((n) => {
        const d = new Float32Array(n.fftSize);
        n.getFloatTimeDomainData(d);
        return d;
      });
      const [l, r] = data;
      let cross = [];
      for (let i = 1; i < l.length; i++)
        if (l[i - 1] < 0 && l[i] >= 0)
          cross.push(i - 1 - l[i - 1] / (l[i] - l[i - 1]));
      const energy = (d) => d.reduce((s, x) => s + x * x, 0),
        el = energy(l),
        er = energy(r);
      return {
        peak: Math.max(...l.map(Math.abs), ...r.map(Math.abs)),
        rms: Math.sqrt(el / l.length),
        frequency:
          cross.length > 2
            ? (c.sampleRate * (cross.length - 1)) / (cross.at(-1) - cross[0])
            : 0,
        correlation:
          l.reduce((s, x, i) => s + x * r[i], 0) / Math.sqrt(el * er),
        audioTime: c.currentTime,
      };
    };
  });
  await page
    .getByRole("button", { name: "Sustentar nota", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      Math.abs(window.sample().frequency - 440) < 0.2 &&
      window.sample().rms > 0.001,
  );
  const a4 = await page.evaluate(() => window.sample());
  await page.getByLabel("Glissando (semitons)", { exact: true }).fill("81");
  await page.waitForFunction(
    () => Math.abs(window.sample().frequency - 880) < 0.2,
  );
  await page.getByLabel("Glissando (semitons)", { exact: true }).fill("57");
  await page.waitForFunction(
    () => Math.abs(window.sample().frequency - 220) < 0.2,
  );
  const stalled = await page.evaluate(() => {
    const end = performance.now() + 900;
    while (performance.now() < end) {
      /* simulate a frozen main thread */
    }
    return window.sample();
  });
  if (stalled.rms > 0.0001)
    throw Error("Watchdog failed during UI stall " + JSON.stringify(stalled));
  await page.waitForFunction(() => window.sample().rms > 0.001);
  await page.getByRole("button", { name: "Classic RCA", exact: true }).click();
  const v = page.getByRole("button", { name: "Segurar vibrato", exact: true });
  await v.focus();
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () =>
      window.worklets
        .find((w) => w.name === "theremin-voice")
        .node.parameters.get("vibratoExpression").value === 1,
  );
  await page.keyboard.up("Space");
  await page.waitForFunction(
    () =>
      window.worklets
        .find((w) => w.name === "theremin-voice")
        .node.parameters.get("vibratoExpression").value === 0,
  );
  await page.getByRole("button", { name: "Ethereal", exact: true }).click();
  await page.waitForTimeout(2500);
  const stereo = await page.evaluate(() => window.sample());
  if (stereo.correlation > 0.9999) throw Error("Reverb is not stereo");
  await page.getByRole("button", { name: "Silenciar", exact: true }).click();
  await page.waitForTimeout(150);
  const tail = await page.evaluate(() => window.sample());
  await page.waitForTimeout(2500);
  const quiet = await page.evaluate(() => window.sample());
  if (quiet.rms > 0.0001 || tail.rms <= quiet.rms)
    throw Error("Reverb release failed");
  if ((await page.evaluate(() => window.worklets.length)) !== 2)
    throw Error("Voice restarted");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/audio-lab-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/audio-lab-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  await page
    .getByRole("button", { name: "Voltar às mãos", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.contexts.every((c) => c.state === "closed"),
  );
  if (errors.length || (await page.evaluate(() => window.cameraRequests)))
    throw Error(JSON.stringify(errors));
  const result = {
    a4,
    stalled,
    stereo,
    tail,
    quiet,
    worklets: 2,
    cameraRequests: 0,
    errors,
  };
  await writeFile(
    `test-results/audio-lab-${process.env.TEST_BROWSER || "chrome"}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
