import { expect, test } from "@playwright/test";
for (const kind of ["templates", "designs", "users", "orders"]) {
  test(`searches ${kind} with bounded pagination and reset`, async ({ page }) => {
    await page.goto(`/${kind}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("tbody tr")).toHaveCount(25);
    const first = await page.locator("tbody tr").first().innerText();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("button", { name: "Go to page 2", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("tbody tr").first()).not.toHaveText(first);
    await page.getByLabel("Filter by status").selectOption({ index: 1 });
    await expect(page.getByRole("button", { name: "Go to page 1", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("searchbox").fill("no-matching-record");
    await expect(page.getByText(/No matching records/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && innerWidth === document.documentElement.clientWidth)).toBe(true);
  });
}
test("edits users and manages an order on its details page", async ({ page }) => {
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "View user USE-1000", exact: true }).click();
  await expect(page).toHaveURL(/\/users\/USE-1000$/);
  await expect(page.getByRole("heading", { name: "User overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account details" })).toBeVisible();
  await page.getByLabel("Full name").fill("Updated Person");
  await page.getByLabel("Email address").fill("updated@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("User details updated");
  await expect(page.getByRole("heading", { name: "Updated Person", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to all users", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Updated Person");
  await page.goto("/orders", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "View order ORD-1000", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/ORD-1000$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const section of ["Order items", "Customer details", "Delivery & tracking", "Order notes", "Order summary", "Payment details", "Shipping address", "Billing address"]) {
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  }
  await page.getByLabel("Update status", { exact: true }).selectOption("Shipped");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status")).toContainText("Order status updated");
  await expect(page.getByText("SIZ100000", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to all orders" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Shipped");
  await page.goto("/orders/ORD-1000", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Order #ORD-1000" })).toBeVisible();
  await page.goto("/orders/ORD-9999", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Order not found." })).toBeVisible();
});

test("jumps to numbered pages and centers the pagination", async ({ page }) => {
  await page.goto("/templates", { waitUntil: "domcontentloaded" });
  const last = page.getByRole("button", { name: "Go to page 6", exact: true });
  await expect(last).toBeEnabled();
  await last.click();
  await expect(last).toHaveAttribute("aria-current", "page");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Prev", exact: true }).click();
  await expect(page.getByRole("button", { name: "Go to page 5", exact: true })).toHaveAttribute("aria-current", "page");
  const alignment = await page.locator(".admin-pagination").evaluate(el => getComputedStyle(el).justifyContent);
  expect(alignment).toBe("center");
});
for (const kind of ["templates", "designs"]) {
  test(`opens ${kind} details from search and supports direct links`, async ({ page }) => {
    const singular = kind === "templates" ? "template" : "design";
    const id = kind === "templates" ? "TEM-1000" : "DES-1000";
    await page.goto(`/${kind}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: `View ${singular} ${id}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${kind}/${id}$`));
    await expect(page.getByRole("heading", { name: `${singular === "template" ? "Template" : "Design"} overview` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Document specifications" })).toBeVisible();
    if (kind === "templates") {
      await expect(page.getByRole("heading", { name: "Publication details" })).toBeVisible();
      await expect(page.getByText("DM Sans, DM Serif Display", { exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Design owner" })).toBeVisible();
      const editor = page.getByRole("link", { name: "View design in editor", exact: true });
      if (await editor.count()) {
        await expect(editor).toHaveAttribute("href", /documentId=DES-1000/);
        await expect(editor).toHaveAttribute("target", "_blank");
      } else {
        await expect(page.getByRole("button", { name: "View design in editor", exact: true })).toBeDisabled();
        await expect(page.getByText("The editor is not connected to this workspace yet.")).toBeVisible();
      }
      await page.getByRole("link", { name: "View template details", exact: true }).click();
      await expect(page).toHaveURL(/\/templates\/TEM-1000$/);
    }
    await page.goto(`/${kind}/${id}`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Autumn dinner 1", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.goto(`/${kind}/missing-id`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: `${singular === "template" ? "Template" : "Design"} not found.` })).toBeVisible();
  });
}

test("user details support direct links, reset, and missing users", async ({ page }) => {
  await page.goto("/users/USE-1001", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Jamie Chen 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  await page.getByLabel("Full name", { exact: true }).fill("Unsaved name");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("Jamie Chen 1");
  await page.getByLabel("Account status", { exact: true }).selectOption("Suspended");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("User details updated");
  await expect(page.locator(".page-heading .badge")).toHaveText("Suspended");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Jamie Chen 1", exact: true })).toBeVisible();
  await page.goto("/users/USE-9999", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "User not found.", exact: true })).toBeVisible();
});
