import { expect, test } from "@playwright/test";

test("saves restaurant details and menu groups across tabs and reloads", async ({
  page,
}) => {
  test.skip(process.env.VITE_DATA_SOURCE === "api", "Uses the demo workspace");
  await page.goto("/dashboard");
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Data management" }).click();
  await page.getByLabel("Restaurant name").fill("Olive Kitchen");
  await page.getByLabel("Opening hours").fill("Tuesday–Sunday 12–8");
  await page.getByRole("button", { name: "Add field" }).click();
  await page.getByLabel("Label", { exact: true }).fill("Instagram");
  await page.getByLabel("Value", { exact: true }).fill("@olivekitchen");

  const tabs = page.getByRole("navigation", {
    name: "Data management sections",
  });
  const menuTab = tabs.getByRole("link", { name: "Menu items" });
  const detailsTab = tabs.getByRole("link", { name: "Restaurant details" });
  await expect(detailsTab).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Add group" })).toHaveCount(0);
  await menuTab.click();
  await expect(page).toHaveURL(/\/data-management\/menu-items$/);
  await expect(menuTab).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Restaurant name")).toBeHidden();
  const mobile = await page
    .getByRole("button", { name: "Open navigation" })
    .isVisible();
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  const sidebar = page.getByRole("navigation", {
    name: "Workspace",
    exact: true,
  });
  await expect(sidebar.getByRole("link", { name: "Menu items" })).toHaveCount(
    0,
  );
  await expect(
    sidebar.getByRole("link", { name: "Data management" }),
  ).toHaveAttribute("aria-current", "page");
  if (mobile) {
    await sidebar.getByRole("link", { name: "Data management" }).click();
    await menuTab.click();
  }

  await page.getByRole("button", { name: "Add group" }).click();
  await page.getByLabel("Group name").fill("Lunch");
  const grid = page.getByRole("region", { name: "Menu item grid" });
  await expect(
    grid.getByRole("columnheader", { name: "Gluten free" }),
  ).toHaveCount(1);
  const nameCell = page.getByLabel("Item 1 name");
  await expect(nameCell).toBeVisible();
  const itemRow = nameCell.locator("xpath=ancestor::tr");
  const blankHeight = (await itemRow.boundingBox())!.height;
  await nameCell.fill("Tomato soup");
  expect((await itemRow.boundingBox())!.height).toBe(blankHeight);
  await expect(page.getByLabel("Item 2 name")).toBeVisible();
  await page.getByLabel("Item 1 price").pressSequentially("8.50");
  await expect(page.getByLabel("Item 1 price")).toHaveValue("8.50");
  await page.getByLabel("Item 1 Vegan").check();
  const soupDetails = page.getByRole("button", {
    name: "Details for Tomato soup",
  });
  await soupDetails.click();
  const detailsPanel = page.getByRole("dialog", { name: "Item details" });
  await detailsPanel.getByRole("button", { name: "Add option" }).click();
  await detailsPanel.getByLabel("Option 1 label").fill("Add chicken");
  await detailsPanel.getByLabel("Option 1 price adjustment").fill("4");
  await detailsPanel.getByRole("button", { name: "Add option" }).click();
  await detailsPanel.getByLabel("Option 2 label").fill("Bread on the side");
  await detailsPanel.getByLabel("Highlight this item").check();
  await detailsPanel.getByLabel("Design notes").fill("Keep add-ons together.");
  await detailsPanel.getByRole("button", { name: "Apply details" }).click();
  await expect(soupDetails).toHaveAttribute("title", /2 options · Highlighted/);
  await page.getByRole("button", { name: "Edit as text" }).click();
  await page
    .getByLabel("Menu items as text")
    .fill("Tomato soup | With bread | 8.50\nOlives | | 5");
  await page.getByRole("button", { name: "Edit as grid" }).click();
  await expect(page.getByLabel("Item 1 Vegan")).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Restaurant data saved." }),
  ).toBeVisible();

  await page.reload();
  await expect(menuTab).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Group name")).toHaveValue("Lunch");
  await detailsTab.click();
  await expect(page.getByLabel("Restaurant name")).toHaveValue("Olive Kitchen");
  await expect(page.getByLabel("Opening hours")).toHaveValue(
    "Tuesday–Sunday 12–8",
  );
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue(
    "@olivekitchen",
  );
  await menuTab.click();
  await expect(page.getByLabel("Group name")).toHaveValue("Lunch");
  await expect(page.getByLabel("Item 1 description")).toHaveValue("With bread");
  await expect(page.getByLabel("Item 1 Vegan")).toBeChecked();
  await expect(page.getByLabel("Item 2 name")).toHaveValue("Olives");
  await expect(soupDetails).toHaveAttribute("title", /2 options · Highlighted/);
  await soupDetails.click();
  await expect(
    detailsPanel.getByLabel("Option 1 price adjustment"),
  ).toHaveValue("4");
  await expect(
    detailsPanel.getByLabel("Option 2 price adjustment"),
  ).toHaveValue("");
  await expect(detailsPanel.getByLabel("Highlight this item")).toBeChecked();
  await expect(detailsPanel.getByLabel("Design notes")).toHaveValue(
    "Keep add-ons together.",
  );
  await detailsPanel
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  if (!mobile) await page.setViewportSize({ width: 900, height: 900 });
  const removeOlives = page.getByRole("button", { name: "Remove item Olives" });
  if (!mobile) {
    await expect(removeOlives.locator("xpath=ancestor::td")).toHaveCSS(
      "display",
      "table-cell",
    );
    expect(await grid.evaluate((element) => element.scrollWidth)).toBe(
      await grid.evaluate((element) => element.clientWidth),
    );
  }
  const priceCell = page.getByLabel("Item 2 price");
  await priceCell.scrollIntoViewIfNeeded();
  const removeBounds = (await removeOlives.boundingBox())!;
  const priceBounds = (await priceCell.boundingBox())!;
  const gridBounds = (await grid.boundingBox())!;
  expect(removeBounds.x + removeBounds.width).toBeLessThanOrEqual(
    gridBounds.x + gridBounds.width,
  );
  expect(removeBounds.y).toBeLessThan(priceBounds.y + priceBounds.height);
  expect(removeBounds.y + removeBounds.height).toBeGreaterThan(priceBounds.y);
  await removeOlives.click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Restaurant data saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Item 1 name")).toHaveValue("Tomato soup");
  await expect(page.getByLabel("Item 2 name")).toHaveValue("");
});
