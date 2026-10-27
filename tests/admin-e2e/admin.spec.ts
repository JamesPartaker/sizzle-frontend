import { expect, test } from "@playwright/test";
for (const kind of ["templates", "designs", "users", "orders"]) {
  test(`searches ${kind} with bounded pagination and reset`, async ({ page }) => {
    await page.goto(`/${kind}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("tbody tr")).toHaveCount(25);
    const first = await page.locator("tbody tr").first().innerText();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await expect(page.locator("tbody tr").first()).not.toHaveText(first);
    await page.getByLabel("Filter by status").selectOption({ index: 1 });
    await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
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
