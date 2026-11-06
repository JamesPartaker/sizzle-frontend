import { expect, test } from "@playwright/test";
const id = "019a4500-0000-7000-8000-000000000001";
const now = "2026-11-05T12:00:00Z";
test.beforeEach(async ({ page }) => {
  let name = "Database owner", status = "Pending";
  await page.route("**/api/v1/admin/**", async route => {
    const url = new URL(route.request().url());
    const [, kind, selected] = url.pathname.split("/admin/")[1].match(/^(\w+)(?:\/([^/]+))?(?:\/(\w+))?$/)!;
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      if (kind === "users") name = body.name;
      else status = body.status;
      return route.fulfill({ status: 204 });
    }
    if (selected === "missing") return route.fulfill({ status: 404 });
    const common = { id, name: kind === "users" ? name : "Database menu", email: "owner@example.com", restaurant: "Database restaurant", status: kind === "orders" ? status : "Active", type: "Menu", quantity: 200, total: 125, updatedAt: now, createdAt: now };
    if (!selected) {
      expect(url.searchParams.get("limit")).toBe("25");
      return route.fulfill({ json: { items: url.searchParams.get("q") === "missing" ? [] : [common], totalItems: 30 } });
    }
    const detail = kind === "users" ? { ...common, lastSignInAt: now, role: "USER" }
      : kind === "orders" ? { ...common, customerName: name, phone: "", placedAt: now, shippingAddress: ["Database address"], billingAddress: [], items: [], subtotal: 100, shipping: 10, tax: 15, payment: { status: "Paid", method: "Visa", reference: "ref" }, delivery: { method: "Standard", estimate: "Nov 10", carrier: "Courier", tracking: "TRACK" }, notes: "" }
      : { ...common, description: "Stored description", style: "Modern", palette: "Warm", tags: [], author: "Studio", version: 2, pages: 1, widthMm: 210, heightMm: 297, orientation: "Portrait", bleedMm: 3, fonts: ["DM Sans"], usageCount: 1, documentId: id, owner: { id, name, email: common.email, restaurant: common.restaurant }, template: { id, name: "Database menu" } };
    return route.fulfill({ json: detail });
  });
});
for (const kind of ["users", "orders", "templates", "designs"]) {
  test(`reads ${kind} search and details through the API`, async ({ page }) => {
    await page.goto(`/${kind}`);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.locator("tbody tr a").last().click();
    await expect(page).toHaveURL(new RegExp(`/${kind}/${id}$`));
    await expect(page.getByRole("heading", { name: kind === "users" ? "Database owner" : kind === "orders" ? `Order #${id}` : "Database menu", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".page-error")).toHaveCount(0);
  });
}
test("persists user edits and order status using API mutations", async ({ page }) => {
  await page.goto(`/users/${id}`);
  await page.getByLabel("Full name", { exact: true }).fill("Updated owner");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("User details saved");
  await expect(page.getByRole("heading", { name: "Updated owner", exact: true })).toBeVisible();
  await page.goto(`/orders/${id}`);
  await page.getByLabel("Update status", { exact: true }).selectOption("Shipped");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status")).toContainText("Order status saved");
  await expect(page.locator(".page-heading .badge")).toHaveText("Shipped");
});
test("shows missing details and API access failures", async ({ page }) => {
  await page.goto("/users/missing");
  await expect(page.getByRole("heading", { name: "User not found.", exact: true })).toBeVisible();
  await page.route("**/api/v1/admin/users?**", route => route.fulfill({ status: 403 }));
  await page.goto("/users");
  await expect(page.getByRole("alert")).toBeVisible();
});
