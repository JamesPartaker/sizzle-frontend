import { expect, test } from "@playwright/test";
test("template filters combine and create a persisted design", async ({
  page,
}) => {
  await page.goto("/templates");
  await page
    .getByLabel("Stationery type", { exact: true })
    .selectOption("Drink menu");
  await page
    .getByRole("searchbox", { name: "Search templates…" })
    .fill("after");
  await expect(page.locator(".template-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Use this template", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("input, textarea")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(page.locator(".doc-row").first()).toContainText(
    "After Hours — new design",
  );
});
test("rename, duplicate, delete and undo", async ({ page }) => {
  await page.goto("/designs");
  await page
    .getByRole("button", {
      name: "Options for Autumn dinner menu",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Rename design" }).click();
  await page.getByLabel("Design name", { exact: true }).fill("Autumn revised");
  await page.getByRole("button", { name: "Save name" }).click();
  await page
    .getByRole("button", { name: "Options for Autumn revised", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate design" }).click();
  await page
    .getByRole("button", {
      name: "Options for Autumn revised (copy)",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Delete design" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete design", exact: true })
    .click();
  await expect(
    page.locator(".doc-row").filter({ hasText: "Autumn revised (copy)" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.locator(".doc-row").filter({ hasText: "Autumn revised (copy)" }),
  ).toHaveCount(1);
});
test("dashboard menu escapes the card and opens an accessible dialog", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page
    .getByRole("button", {
      name: "Options for Autumn dinner menu",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Delete design" }),
  ).toBeVisible();
  const visible = await page
    .getByRole("menuitem", { name: "Delete design" })
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return !!document
        .elementFromPoint(r.left + 10, r.top + 10)
        ?.closest('[role="menuitem"]');
    });
  expect(visible).toBe(true);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Preview Sunday Table", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("uploads survive reload and order links resolve", async ({ page }) => {
  await page.goto("/assets");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1EAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.locator(".asset-card").filter({ hasText: "logo.png" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".asset-card").filter({ hasText: "logo.png" }),
  ).toBeVisible();
  await page.goto("/orders");
  await page.locator(".order-row").first().click();
  await expect(
    page.getByRole("heading", { name: "Order #SZ-2048", exact: true }),
  ).toBeVisible();
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
});
