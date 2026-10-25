import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto("https://www.youtube.com/watch?v=ajM4vYCZMZk", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log((await page.locator("body").innerText()).slice(0, 1800));
  await mkdir("test-results/reference", { recursive: true });
  await page.screenshot({ path: "test-results/reference/page.png" });
  const v = page.locator("video").first();
  if (!(await v.count())) throw Error("Player não disponível");
  console.log(
    await v.evaluate((el) => ({
      duration: el.duration,
      ready: el.readyState,
      error: el.error?.message,
    })),
  );
  await page.waitForTimeout(3000);
  for (const second of [90, 120]) {
    await page.evaluate((t) => {
      const p = document.querySelector("#movie_player");
      p.mute();
      p.seekTo(t, true);
      p.playVideo();
    }, second);
    await page.waitForTimeout(4000);
    console.log(
      await v.evaluate((el) => ({
        current: el.currentTime,
        ready: el.readyState,
        error: el.error?.message,
      })),
    );
    await v.screenshot({ path: `test-results/reference/frame-${second}.png` });
  }
} finally {
  await browser.close();
}
