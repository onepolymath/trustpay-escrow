/**
 * End-to-end demo flow, driven through the real UI against a local validator running the real
 * program (see scripts/e2e-local.sh). Exercises: demo wallets + faucet, vendor registration,
 * order creation, Blink/QR share sheet, buyer payment, shipment, confirmation, a second order
 * disputed and ruled 70/30 by the demo arbiter, and the vendor reputation page.
 * Screenshots land in docs/img (used by the README).
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const OUT = process.env.OUT ?? new URL("../docs/img", import.meta.url).pathname;
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
  colorScheme: "light",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300));
});

const shot = async (name, opts = {}) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log("shot", name);
};
const toastOk = async (text) => {
  await page.getByText(text).first().waitFor({ timeout: 60_000 });
};
const role = async (r) => {
  await page.evaluate((r) => localStorage.setItem("trustpay.demo-role", r), r);
  await page.reload();
  await page.waitForLoadState("networkidle");
};

await page.goto(BASE, { waitUntil: "networkidle" });
await shot("home-light");
await page.getByRole("button", { name: /Try the live demo/ }).click();
await page.getByRole("button", { name: "Start demo" }).click();
await page.waitForURL("**/sell", { timeout: 60_000 });
await page.getByLabel(/handle/i).fill("ummie.styles");
await shot("register");
await page.getByRole("button", { name: "Create storefront" }).click();
await toastOk("Storefront created");
await page.getByLabel("Item").waitFor();

async function createOrder(title, price) {
  await page.getByLabel("Item").fill(title);
  await page.getByLabel("Price").fill(price);
  await page.getByRole("button", { name: /Create order link/ }).click();
  await toastOk("Order created");
  await page.getByRole("dialog").getByText("Share with your buyer").waitFor({ timeout: 60_000 });
}
await createOrder("Ankara wrap dress, size M", "25");
await shot("share");
const orderUrl = await page.getByRole("dialog").locator("span.font-mono").first().innerText();
console.log("order url", orderUrl);
await page.keyboard.press("Escape");
await shot("vendor-console");

// Buyer pays
await page.goto(orderUrl.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
await role("buyer");
await shot("order-buyer-pay");
await page.getByRole("button", { name: /into escrow/ }).click();
await toastOk("Paid. Your money is safe in escrow.");
await page.getByText("Paid · awaiting shipment").first().waitFor();
await shot("order-funded");

// Vendor ships
await role("vendor");
await page.getByRole("button", { name: "Mark as shipped" }).click();
await page.getByLabel(/Tracking number/).fill("GIGL 4471-0098");
await page.getByRole("button", { name: "Confirm shipment" }).click();
await toastOk("Marked as shipped");
await page.waitForTimeout(1500);

// Buyer confirms
await role("buyer");
await page.getByText("Shipped").first().waitFor();
await shot("order-shipped");
await page.getByRole("button", { name: /I received it/ }).click();
await toastOk("Funds released to the vendor");
await page.getByText("Completed").first().waitFor();
await shot("order-completed");

// Second order → dispute → arbiter
await role("vendor");
await page.goto(`${BASE}/sell`, { waitUntil: "networkidle" });
await createOrder("Shea butter set (3 jars)", "40");
const orderUrl2 = await page.getByRole("dialog").locator("span.font-mono").first().innerText();
await page.goto(orderUrl2.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
await role("buyer");
await page.getByRole("button", { name: /into escrow/ }).click();
await toastOk("Paid. Your money is safe in escrow.");
await role("vendor");
await page.getByRole("button", { name: "Mark as shipped" }).click();
await page.getByRole("button", { name: "Confirm shipment" }).click();
await toastOk("Marked as shipped");
await role("buyer");
await page.getByRole("button", { name: "Open a dispute" }).click();
await page.getByLabel("What went wrong?").fill("Received 2 jars instead of 3, and one was opened.");
await shot("dispute-dialog");
await page.getByRole("button", { name: "Freeze funds" }).click();
await toastOk("Dispute opened");
await page.waitForTimeout(1200);
await shot("order-disputed");

await page.goto(`${BASE}/arbiter`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Review" }).first().click();
await page.getByRole("button", { name: "70 / 30" }).click();
await shot("arbiter-ruling");
await page.getByRole("button", { name: "Issue ruling" }).click();
await toastOk("Ruling recorded on chain");
await page.waitForTimeout(1500);
await shot("arbiter-empty");

// Vendor reputation page
const vendorPath = new URL(orderUrl).pathname.split("/")[2];
await page.goto(`${BASE}/v/${vendorPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("vendor-reputation");

// Dark mode + mobile
await page.emulateMedia({ colorScheme: "dark" });
await page.evaluate(() => localStorage.setItem("theme", "dark"));
await page.goto(orderUrl.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("order-completed-dark");
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("home-dark");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(orderUrl2.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("mobile-order-dark", { fullPage: false });

console.log("E2E OK");
await browser.close();
