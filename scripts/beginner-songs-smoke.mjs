import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createMediaStreamDestination() {
        const out = super.createMediaStreamDestination();
        const analyser = this.createAnalyser();
        analyser.fftSize = 2048;
        const mute = this.createGain();
        mute.gain.value = 0;
        this.createMediaStreamSource(out.stream)
          .connect(analyser)
          .connect(mute)
          .connect(this.destination);
        window.level = () => {
          const samples = new Float32Array(2048);
          analyser.getFloatTimeDomainData(samples);
          return Math.max(...samples.map(Math.abs));
        };
        return out;
      }
    };
  });
  await page.goto("http://localhost:5173");
  for (const id of [
    "ode-joy",
    "little-star",
    "amazing-grace",
    "frere-jacques",
    "mary-lamb",
    "hot-cross-buns",
    "london-bridge",
    "row-your-boat",
    "greensleeves",
    "silent-night",
    "brahms-lullaby",
    "minuet-g",
    "ave-maria",
    "fur-elise",
    "new-world-largo",
    "moonlight",
    "gymnopedie-1",
  ]) {
    if (id === "greensleeves")
      await page.locator(".song-level select").selectOption("medium");
    await page.locator(".song-selection select").selectOption(id);
    await page.locator(".song-transport button").first().click();
    await page.waitForFunction(
      () => window.level?.() > 0.001,
      {},
      { timeout: 8000 },
    );
    await page.locator(".song-target").waitFor();
    await page.locator(".song-stop").click();
    await page
      .locator(".song-mode-row .song-segments")
      .first()
      .locator("button")
      .nth(1)
      .click();
    await page.locator(".song-start").click();
    await page.locator(".song-target").waitFor();
    if (await page.locator(".song-rising").count())
      throw Error("Step mode shows future notes");
    await page.locator(".song-stop").click();
    await page
      .locator(".song-mode-row .song-segments")
      .first()
      .locator("button")
      .first()
      .click();
    console.log(id + ": real audio, timed target and step target OK");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight > innerHeight ||
        document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Mobile overflow");
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
