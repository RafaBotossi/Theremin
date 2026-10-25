import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const seconds = Number(process.env.SOAK_SECONDS || 900);
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.contexts = [];
    const Native = window.AudioContext;
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
  });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  await page
    .getByRole("button", { name: "Laboratório de áudio", exact: true })
    .click();
  if (await page.evaluate(() => window.contexts.length))
    throw Error("Audio before click");
  await page.getByRole("button", { name: "Ativar áudio", exact: true }).click();
  await page
    .getByText("Áudio ativo · segure uma nota ou use Sustentar", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Classic RCA", exact: true }).click();
  await page
    .getByRole("button", { name: "Sustentar nota", exact: true })
    .click();
  await page.evaluate(() => {
    const c = window.contexts[0],
      a = c.createAnalyser();
    a.fftSize = 4096;
    c.createMediaStreamSource(c.output.stream).connect(a);
    const g = c.createGain();
    g.gain.value = 0;
    a.connect(g).connect(c.destination);
    window.metrics = () => {
      const d = new Float32Array(4096);
      a.getFloatTimeDomainData(d);
      return {
        audioTime: c.currentTime,
        state: c.state,
        peak: Math.max(...d.map(Math.abs)),
        rms: Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length),
        heap: performance.memory?.usedJSHeapSize || null,
      };
    };
  });
  await page.waitForFunction(() => window.metrics().rms > 0.001);
  const began = Date.now(),
    measurements = [];
  while ((Date.now() - began) / 1000 < seconds) {
    await page.waitForTimeout(
      Math.min(10000, Math.max(1, seconds * 1000 - (Date.now() - began))),
    );
    const m = await page.evaluate(() => window.metrics());
    m.wall = (Date.now() - began) / 1000;
    measurements.push(m);
    if (
      m.state !== "running" ||
      m.rms < 0.0001 ||
      m.peak >= 0.99 ||
      !Number.isFinite(m.rms) ||
      errors.length
    )
      throw Error(JSON.stringify({ m, errors }));
    if (measurements.length % 3 === 0) console.log(JSON.stringify(m));
    await page
      .getByLabel("Glissando (semitons)", { exact: true })
      .fill(String(45 + ((measurements.length * 7) % 40)));
    if (measurements.length % 6 === 0)
      await page
        .getByRole("button", {
          name: ["Classic RCA", "Ethereal", "Pure"][
            Math.floor(measurements.length / 6) % 3
          ],
          exact: true,
        })
        .click();
  }
  await page
    .getByRole("button", { name: "Desativar áudio", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.contexts.every((c) => c.state === "closed"),
  );
  const result = {
    durationSeconds: (Date.now() - began) / 1000,
    measurements,
    errors,
    closed: true,
  };
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/audio-soak.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      durationSeconds: result.durationSeconds,
      samples: measurements.length,
      errors,
      closed: true,
    }),
  );
} finally {
  await browser.close();
}
