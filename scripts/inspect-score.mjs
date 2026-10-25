import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  await page.goto("https://musescore.com/user/19027351/scores/6167724", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  console.log((await page.locator("body").innerText()).slice(0, 4500));
  await mkdir("test-results/reference", { recursive: true });
  await page.screenshot({ path: "test-results/reference/score.png" });
} finally {
  await browser.close();
}
