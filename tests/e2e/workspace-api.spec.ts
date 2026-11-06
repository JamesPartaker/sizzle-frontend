import { expect, test } from "@playwright/test";
test.skip(process.env.VITE_DATA_SOURCE !== "api", "Run with VITE_DATA_SOURCE=api VITE_AUTH_SOURCE=api.");
const id = "019a4500-0000-7000-8000-000000000001";
const order = { id, name: "Stored dinner", status: "Shipped", quantity: 200, total: 147.5,
  placedAt: "2026-11-05T12:00:00Z", updatedAt: "2026-11-05T13:00:00Z", customerName: "Database owner",
  shippingAddress: ["Stored shipping address"], billingAddress: ["Stored billing address"], items: [], subtotal: 125, shipping: 10, tax: 12.5,
  payment: { status: "Paid", method: "Visa ending 1234" },
  delivery: { method: "Standard", estimate: "Nov 10", carrier: "Courier", tracking: "TRACK123" } };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/assets/storage") ? { limit_bytes: 1048576, used_bytes: 0, reserved_bytes: 0 } : path.endsWith("/me") ? { UserId: id, EmailAddress: "owner@example.com", WorkspaceId: id, Role: "USER", Name: "Database owner", Restaurant: "Stored restaurant", Status: "Active" }
      : path.endsWith("/orders") ? [order] : path.endsWith(`/orders/${id}`) ? order
      : path.includes("/orders/") ? null : path.endsWith("/assets") ? { assets: [] } : [];
    await route.fulfill({ status: json === null ? 404 : 200, json });
  });
});
test("workspace API loads real profile, history, details and logout", async ({ page }) => {
  await page.goto("/orders");
  if (await page.getByRole("button", { name: "Open navigation", exact: true }).isVisible()) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByText("Stored restaurant", { exact: true })).toBeVisible();
  await expect(page.locator(".profile")).toContainText("Database owner");
  if (await page.locator(".mobile-nav-shade").count()) await page.locator(".mobile-nav-shade").click({ position: { x: page.viewportSize()!.width - 10, y: 100 } });
  await page.locator(".order-row").click();
  await expect(page.getByText("TRACK123", { exact: false })).toBeVisible();
  await expect(page.getByText("Stored shipping address", { exact: true })).toBeVisible();
  await expect(page.getByText("$12.50", { exact: true })).toBeVisible();
  await expect(page.getByText("$10.00", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("TRACK123", { exact: false })).toBeVisible();
  await page.route("**/logout", route => route.fulfill({ status: 204 }));
  if (await page.getByRole("button", { name: "Open navigation", exact: true }).isVisible()) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("workspace API loads a detail link directly and handles missing orders", async ({ page }) => {
  await page.goto(`/orders/${id}`);
  await expect(page.getByText("Stored billing address", { exact: true })).toBeVisible();
  await page.goto("/orders/missing");
  await expect(page.getByText("Order not found.", { exact: false })).toBeVisible();
});
test("workspace API redirects expired sessions and leaves Google unconfigured", async ({ page }) => {
  await page.route("**/api/v1/me", route => route.fulfill({ status: 401 }));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status")).toContainText("not configured");
});
