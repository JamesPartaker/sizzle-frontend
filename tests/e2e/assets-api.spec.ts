import { expect, test } from "@playwright/test";

test.skip(process.env.VITE_ASSET_SOURCE !== "api", "Run with VITE_ASSET_SOURCE=api.");
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/assets/storage", route => route.fulfill({ json: { limit_bytes: 1048576, used_bytes: 0, reserved_bytes: 0 } }));
});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1EAAAAASUVORK5CYII=", "base64");
const asset = {
  id: "019a4500-0000-7000-8000-000000000001", filename: "logo.png",
  content_type: "image/png", size_bytes: png.length, state: "ready", created_at: "2026-11-04T00:00:00Z",
};

test("uploads bytes, completes, displays a private preview, and reloads server assets", async ({ page }) => {
  let ready = false;
  let uploaded = false;
  await page.route("**/api/v1/assets", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { assets: ready ? [asset] : [] } });
    expect(route.request().postDataJSON()).toEqual({ filename: "logo.png", content_type: "image/png", size_bytes: png.length });
    await route.fulfill({ status: 201, json: { asset: { ...asset, state: "pending" }, upload: {
      url: "https://storage.example.test/upload", headers: { "Content-Type": "image/png", "Content-Length": String(png.length) }, expires_in: 300,
    } } });
  });
  await page.route("https://storage.example.test/upload", async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataBuffer()).toEqual(png);
    uploaded = true;
    await route.fulfill({ status: 200 });
  });
  await page.route(`**/api/v1/assets/${asset.id}/complete`, async (route) => {
    expect(uploaded).toBe(true);
    ready = true;
    await route.fulfill({ json: asset });
  });
  await page.route(`**/api/v1/assets/${asset.id}/download`, (route) => route.fulfill({ json: {
    url: "https://storage.example.test/preview", headers: null, expires_in: 300,
  } }));
  await page.route("https://storage.example.test/preview", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/assets");
  await expect(page.locator(".asset-card")).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  const card = page.locator(".asset-card").filter({ hasText: "logo.png" });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveJSProperty("naturalWidth", 1);
  await page.reload();
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sizzle-assets"))).toBeNull();
  await page.route(`**/api/v1/assets/${asset.id}`, async route => {
    expect(route.request().method()).toBe("DELETE");
    ready = false;
    await route.fulfill({ status: 204 });
  });
  await card.getByRole("button", { name: "Delete asset", exact: true }).click();
  await expect(card).toHaveCount(0);
});

test("reports quota failures and lets the same file be selected again", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/v1/assets", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { assets: null } });
    attempts++;
    await route.fulfill({ status: 409, json: { message: "workspace asset storage limit exceeded" } });
  });
  await page.goto("/assets");
  for (let i = 0; i < 2; i++) {
    await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("status")).toContainText("storage is full");
    await expect(page.locator('input[type="file"]')).toHaveValue("");
  }
  expect(attempts).toBe(2);
  await expect(page.locator(".asset-card")).toHaveCount(0);
});
