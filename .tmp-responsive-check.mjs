import { chromium } from "playwright";
import fs from "fs";

const token = fs.readFileSync("c:/Personal_Projects/Dashboard/.tmp-token.txt", "utf8").trim();
const browser = await chromium.launch();
const errors = [];

const sizes = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1440, height: 900 },
];

for (const size of sizes) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${size.name}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${size.name}] ${err}`));

  await page.goto(`http://localhost:3000/tmp-auth-preview?token=${token}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=+ Add widget", { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `c:/Personal_Projects/Dashboard/.tmp-responsive-${size.name}.png`, fullPage: true });
  await context.close();
}

console.log("CONSOLE ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
