import { chromium } from "playwright";
import fs from "fs";

const token = fs.readFileSync("c:/Personal_Projects/Dashboard/.tmp-token.txt", "utf8").trim();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (msg) => console.log("CONSOLE:", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("PAGEERROR:", err));
page.on("requestfailed", (req) => console.log("REQFAILED:", req.url(), req.failure()));

await page.goto(`http://localhost:3000/tmp-auth-preview?token=${token}`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log("BODY TEXT:", await page.textContent("body"));
await page.screenshot({ path: "c:/Personal_Projects/Dashboard/.tmp-debug.png" });
await browser.close();
