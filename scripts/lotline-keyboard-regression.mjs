import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const URL = process.env.LOTLINE_KEYBOARD_URL || "http://127.0.0.1:5173/3d/?quality=lq";
const VIEWPORT = { width: 1024, height: 768 };

function approxEqual(actual, expected, epsilon = 0.00001) {
  return Math.abs(actual - expected) <= epsilon;
}

async function waitForViewer(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("iframe.sogs-migrated-iframe", { timeout: 60000 });
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector("iframe.sogs-migrated-iframe");
      const win = iframe?.contentWindow;
      return !!win?.__sogsCtx?.app && !!win.__sogsProjectWorldPoint;
    },
    null,
    { timeout: 90000 },
  );
  await page.waitForSelector('[aria-label="Toggle lot line editor"]:not([disabled])', { timeout: 30000 });
}

async function selectedVertex(page) {
  return page.evaluate(() => document.querySelector('[data-testid="lot-line-point-picker"]')?.value);
}

async function selectedY(page) {
  return page.evaluate(() => Number(document.querySelector('[data-testid="lot-line-y"]')?.value));
}

async function waitForVertex(page, expected) {
  await page.waitForFunction(
    (value) => document.querySelector('[data-testid="lot-line-point-picker"]')?.value === value,
    expected,
    { timeout: 5000 },
  );
}

async function waitForY(page, expected) {
  await page.waitForFunction(
    (value) => {
      const input = document.querySelector('[data-testid="lot-line-y"]');
      return Math.abs(Number(input?.value) - value) <= 0.00001;
    },
    expected,
    { timeout: 5000 },
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
page.on("console", (msg) => {
  if (msg.type() === "error") console.error(msg.text());
});

await waitForViewer(page);
await page.locator('[aria-label="Toggle lot line editor"]').click();
await page.waitForSelector('[data-testid="lot-line-editor-panel"].active', { timeout: 10000 });

const initialVertex = await selectedVertex(page);
if (initialVertex !== "KML_V1") {
  throw new Error(`Expected KML_V1 to be initially selected, got ${initialVertex}`);
}

await page.evaluate(() => document.body.focus());
await page.keyboard.press("ArrowRight");
await waitForVertex(page, "KML_V2");

const beforeParentY = await selectedY(page);
await page.keyboard.press("ArrowUp");
await waitForY(page, beforeParentY + 0.001);

await page.locator("iframe.sogs-migrated-iframe").click({ position: { x: 512, y: 384 } });
await page.keyboard.press("ArrowRight");
await waitForVertex(page, "KML_V3");

const beforeIframeY = await selectedY(page);
await page.keyboard.press("ArrowDown");
await waitForY(page, beforeIframeY - 0.001);

await page.keyboard.press("ArrowLeft");
await waitForVertex(page, "KML_V2");

const finalY = await selectedY(page);
if (!approxEqual(finalY, beforeParentY + 0.001)) {
  throw new Error(`Expected returning to KML_V2 to preserve Y ${beforeParentY + 0.001}, got ${finalY}`);
}

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      parentKeyboard: { selectedAfterRight: "KML_V2", yBefore: beforeParentY, yAfter: beforeParentY + 0.001 },
      iframeKeyboard: { selectedAfterRight: "KML_V3", yBefore: beforeIframeY, yAfter: beforeIframeY - 0.001 },
    },
    null,
    2,
  ),
);
