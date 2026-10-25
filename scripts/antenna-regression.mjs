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
    if (!localStorage.getItem("air-theremin-settings"))
      localStorage.setItem(
        "air-theremin-settings",
        JSON.stringify({ pitchLeft: false, handLayoutVersion: 1 }),
      );
    window.testHands = [
      { x: 0.25, y: 0.6 },
      { x: 0.735, y: 0.5 },
    ];
    window.openness = 0.5;
    window.tipOffset = 0;
  });
  await page.route("**/src/vision/HandTracker.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export class HandTracker {delegate='SIMULATED';static async create(){return new HandTracker();}close(){}detect(){return window.testHands.map(p=>({point:p,openness:window.openness,label:'Left',score:.55,landmarks:Array.from({length:21},(_,i)=>i===8 && p.x>.5 ? {x:p.x+window.tipOffset,y:p.y}:p)}));}}`,
    }),
  );
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174/");
  await page.getByRole("button", { name: "Treino", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.getByText("● AO VIVO", { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      Math.abs(
        parseFloat(document.querySelector(".note small").textContent) - 440,
      ) < 1,
  );
  await page.evaluate(() => {
    window.openness = 1;
    window.tipOffset = 0.025;
  });
  await page.waitForFunction(
    () => parseFloat(document.querySelector(".note small").textContent) > 490,
  );
  await page.evaluate(() => {
    window.testHands[1].x = 0.78;
  });
  await page.waitForFunction(
    () => parseFloat(document.querySelector(".note small").textContent) > 600,
  );
  await page.evaluate(() => {
    window.testHands[0].y = 0.9;
  });
  await page.waitForFunction(
    () => document.querySelector("meter").value < 0.001,
  );
  await page
    .getByRole("combobox", { name: "Exercício", exact: true })
    .selectOption("intervals");
  await page.evaluate(() => {
    window.openness = 0.5;
    window.tipOffset = 0;
    window.testHands = [
      { x: 0.25, y: 0.6 },
      { x: 0.735, y: 0.5 },
    ];
  });
  await page
    .getByText("Boa! Baixe a mão até o laço", { exact: false })
    .waitFor({ timeout: 10000 });
  const target = await page.locator(".practice-readout strong").textContent();
  await page.evaluate(() => {
    window.testHands[0].y = 0.82;
  });
  await page.waitForFunction(
    (t) => document.querySelector(".practice-readout strong").textContent !== t,
    target,
  );
  const positions = [];
  for (const hands of [
    [
      { x: 0.25, y: 0.6 },
      { x: 0.735, y: 0.5 },
    ],
    [{ x: 0.735, y: 0.5 }],
    [],
    [{ x: 0.25, y: 0.6 }],
  ]) {
    await page.evaluate((h) => {
      window.testHands = h;
    }, hands);
    await page.waitForTimeout(300);
    positions.push(
      await page
        .locator(".instructions")
        .evaluate((el) => el.getBoundingClientRect().top),
    );
  }
  if (Math.max(...positions) - Math.min(...positions) > 1)
    throw Error("Cards shifted");
  await page.evaluate(() => {
    window.testHands = [
      { x: 0.25, y: 0.6 },
      { x: 0.74, y: 0.5 },
    ];
  });
  await page.getByRole("button", { name: "Calibrar", exact: true }).click();
  await page.getByRole("heading", { name: "Mova a mão de pitch ↔" }).waitFor();
  await page.evaluate(() => {
    window.motion = setInterval(() => {
      window.testHands[1].x = window.testHands[1].x > 0.74 ? 0.7 : 0.78;
    }, 200);
  });
  await page
    .getByRole("heading", { name: "Mova a mão de volume ↕" })
    .waitFor({ timeout: 15000 });
  await page.evaluate(() => {
    clearInterval(window.motion);
    window.motion = setInterval(() => {
      window.testHands[0].y = window.testHands[0].y > 0.6 ? 0.55 : 0.75;
    }, 200);
  });
  await page
    .getByRole("region", { name: "Calibração guiada" })
    .waitFor({ state: "detached", timeout: 15000 });
  await page.evaluate(() => {
    clearInterval(window.motion);
    window.testHands[0].y = 0.6;
  });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("air-theremin-settings")),
  );
  if (
    Math.abs(saved.antennaFar - saved.antennaNear - 0.08) > 0.001 ||
    Math.abs(saved.antennaY - 0.75) > 0.001
  )
    throw Error("Small calibration missing");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/antennas-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "Iniciar câmera e áudio" }).click();
  await page.getByText("● AO VIVO", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Calibrar", exact: true }).click();
  await page.getByRole("heading", { name: "Mova a mão de pitch ↔" }).waitFor();
  await page.screenshot({
    path: "test-results/antennas-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  if (errors.length) throw Error(errors.join("\n"));
  const result = {
    fingerAdjustment: true,
    antennaApproach: true,
    loopMute: true,
    automaticTargets: true,
    smallCalibration: true,
    cardPositions: positions,
    errors,
  };
  await writeFile(
    "test-results/antennas-report.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
