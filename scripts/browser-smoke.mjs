import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:4173/Theremin/";
await mkdir("test-results", { recursive: true });
const reports = [];
for (const channel of ["chrome", "msedge"]) {
  const browser = await chromium.launch({
    channel,
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
      permissions: ["camera"],
    });
    const page = await context.newPage();
    const errors = [],
      consoleErrors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", (r) => {
      if (
        !r.url().startsWith(new URL(base).origin) &&
        !r.url().startsWith("blob:")
      )
        external.push(r.url());
    });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Iniciar câmera e áudio" })
      .waitFor();
    await page.screenshot({
      path: `test-results/${channel}-desktop.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
    await page.locator(".camera-stage.live").waitFor({ timeout: 60000 });
    const detail = "Camera started";
    await page.getByRole("button", { name: "Gravar", exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Encerrar gravação" }).click();
    await page.getByText("↓ Baixar gravação").waitFor();
    await page.getByRole("button", { name: "Mutar", exact: true }).click();
    await page.getByRole("button", { name: "Desmutar", exact: true }).waitFor();
    await page.getByRole("button", { name: "Calibrar", exact: true }).click();
    await page
      .getByRole("status")
      .filter({
        hasText:
          "Mostre o indicador da mão de nota e a palma aberta da mão de volume. O avanço é automático.",
      })
      .waitFor();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("button", { name: "Parar", exact: true }).click();
    await page.waitForTimeout(100);
    if (await page.locator("video").evaluate((v) => v.srcObject !== null))
      throw new Error("Camera not released");
    await page.setViewportSize({ width: 390, height: 844 });
    // Render the mobile entry screen in a fresh document after releasing WebGL.
    await page.reload();
    await page
      .getByRole("button", { name: "Iniciar câmera e áudio" })
      .waitFor();
    await page.waitForTimeout(250);
    const startBounds = await page
      .getByRole("button", { name: "Iniciar câmera e áudio" })
      .boundingBox();
    if (
      !startBounds ||
      startBounds.x < 0 ||
      startBounds.x + startBounds.width > 390
    )
      throw new Error("Start control clipped on mobile");
    await page.screenshot({
      path: `test-results/${channel}-mobile.png`,
      fullPage: true,
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error("Mobile horizontal overflow");
    if (errors.length || external.length || consoleErrors.length)
      throw new Error(JSON.stringify({ errors, external, consoleErrors }));
    reports.push({
      channel,
      result: "passed",
      detail,
      externalRequests: external,
      pageErrors: errors,
      consoleErrors,
    });
  } finally {
    await browser.close();
  }
}
await writeFile(
  "test-results/browser-report.json",
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));
