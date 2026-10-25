import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:5173") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("http://localhost:5173/");
  await page
    .getByRole("combobox", { name: "Música", exact: true })
    .selectOption("ecstasy");
  await page.getByLabel("Começar em").selectOption("12");
  await page.getByRole("button", { name: "Iniciar guia", exact: true }).click();
  await page.locator(".song-target").waitFor({ timeout: 6000 });
  const first = await page.locator(".song-target span").textContent();
  await page.waitForFunction(
    (t) => document.querySelector(".song-target span")?.textContent !== t,
    first,
  );
  await page.getByRole("button", { name: "Pausar guia", exact: true }).click();
  const target = await page.locator(".song-target").getAttribute("style");
  await page.waitForTimeout(500);
  if ((await page.locator(".song-target").getAttribute("style")) !== target)
    throw Error("Pause moved");
  const left = await page
    .locator(".song-target")
    .evaluate((el) => parseFloat(el.style.left));
  if (left >= 50) throw Error("Target is on the volume side");
  const marker = await page.locator(".song-target").boundingBox();
  const guide = await page.locator(".note-guide").boundingBox();
  if (
    !marker ||
    !guide ||
    marker.height > 40 ||
    Math.abs(marker.y - guide.y) > 1
  )
    throw Error("Current note must be a small dot at the top");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/song-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Encerrar guia", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Música", exact: true })
    .selectOption("midi");
  // Original two-note test melody, 480 PPQ, 120 BPM.
  const bytes = [
    77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, 0, 0, 0,
    22, 0, 144, 60, 100, 131, 96, 128, 60, 0, 0, 144, 62, 100, 131, 96, 128, 62,
    0, 0, 255, 47, 0,
  ];
  await page.getByLabel("Importar melodia MIDI").setInputFiles({
    name: "original-test.mid",
    mimeType: "audio/midi",
    buffer: Buffer.from(bytes),
  });
  await page.getByRole("combobox", { name: "Trilha da melodia" }).waitFor();
  await page.getByRole("button", { name: "Iniciar guia", exact: true }).click();
  await page.locator(".song-target").waitFor({ timeout: 6000 });
  await page
    .getByRole("button", { name: "Encerrar guia", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("combobox", { name: "Música", exact: true })
    .selectOption("ecstasy");
  await page.getByRole("button", { name: "Iniciar guia", exact: true }).click();
  await page.locator(".song-target").waitFor({ timeout: 6000 });
  await page.getByRole("button", { name: "Pausar guia", exact: true }).click();
  await page.screenshot({
    path: "test-results/song-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  if (errors.length || external.length)
    throw Error(JSON.stringify({ errors, external }));
  const result = {
    timedHighlight: true,
    pause: true,
    leftAntenna: true,
    midiImport: true,
    mobile: true,
    errors,
    external,
  };
  await writeFile(
    "test-results/song-report.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
