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
test("edits users and updates order status with accessible dialogs", async ({ page }) => {
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Edit user USE-1000", exact: true }).click();
  await page.getByLabel("Full name").fill("Updated Person");
  await page.getByLabel("Email address").fill("updated@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("Updated Person");
  await page.goto("/orders", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Update status for ORD-1000", exact: true }).click();
  await page.getByLabel("Order status", { exact: true }).selectOption("Shipped");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Shipped");
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
