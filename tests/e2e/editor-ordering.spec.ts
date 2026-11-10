import { expect, test } from "@playwright/test";
import {
  emptyDocument,
  ensureProduction,
  addCover,
} from "../../packages/document/src/index.mjs";
import { emptyCheckout } from "../../packages/api-client/src/ordering";

test.skip(
  !process.env.SIZZLE_EDITOR_TEST_URL,
  "Set SIZZLE_EDITOR_TEST_URL to a running built editor.",
);

test("editor saves the artwork before adding separate cover and paper quantities and has no document exports", async ({
  page,
}) => {
  const id = "019a4500-0000-7000-8000-000000000001";
  let doc = ensureProduction(emptyDocument("Dinner menu"));
  addCover(doc);
  let revision = 1;
  const adds: any[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/design/${id}`))
      return route.fulfill({
        json: {
          name: "Dinner menu",
          description: "",
          revision,
          document: { Document: doc, DocumentVersion: 1 },
        },
      });
    if (path.endsWith("/document")) {
      const input = route.request().postDataJSON();
      expect(input.revision).toBe(revision);
      revision++;
      doc = input.Document;
      return route.fulfill({ json: { revision, document: doc } });
    }
    if (path.endsWith("/order/draft"))
      return route.fulfill({
        json: {
          id,
          version: 0,
          items: [],
          checkout: emptyCheckout(),
          warnings: [],
        },
      });
    if (path.endsWith("/parts"))
      return route.fulfill({
        json: {
          designId: id,
          name: "Dinner menu",
          revision,
          parts: [
            {
              key: "cover:cover",
              name: "Cover",
              kind: "cover",
              unit: "cover",
              pageIds: ["front", "back"],
              size: "220 × 306 mm",
              paper: "linen",
              finish: "foil",
            },
            {
              key: "paper:page_1",
              name: "Menu page",
              kind: "paper",
              unit: "sheet",
              pageIds: ["page_1"],
              size: "216 × 279 mm",
              paper: "uncoated",
              finish: "None",
            },
          ],
        },
      });
    if (path.endsWith("/order/draft/items")) {
      adds.push(route.request().postDataJSON());
      return route.fulfill({ json: {} });
    }
    if (path.includes("/thumbnail"))
      return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="#eee"/></svg>',
      });
    if (path.endsWith("/assets"))
      return route.fulfill({ json: { assets: [] } });
    if (path.endsWith("/assets/storage"))
      return route.fulfill({
        json: { limit_bytes: 100000, used_bytes: 0, reserved_bytes: 0 },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto(`${process.env.SIZZLE_EDITOR_TEST_URL}/?documentId=${id}`);
  const add = page.getByRole("button", { name: "Add to order", exact: true });
  await expect(add).toBeEnabled();
  await page
    .getByRole("button", { name: "Pages & cover", exact: true })
    .click();
  await page
    .getByLabel("Surface name", { exact: true })
    .fill("Updated cover front");
  await page.getByLabel("Surface name", { exact: true }).blur();
  await expect(
    page.getByRole("button", { name: /Print \/ Order|Download my draft/ }),
  ).toHaveCount(0);
  await add.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Cover quantity").fill("10");
  await page.getByLabel("Menu page quantity").fill("20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  await expect(
    page.getByText("Added to your order.", { exact: true }).first(),
  ).toBeVisible();
  expect(adds).toHaveLength(1);
  expect(adds[0].revision).toBeGreaterThan(1);
  expect(adds[0].parts).toEqual([
    { key: "cover:cover", quantity: 10 },
    { key: "paper:page_1", quantity: 20 },
  ]);
  await expect(
    page.getByRole("link", { name: "View order & checkout" }),
  ).toHaveAttribute("href", /\/order$/);
  expect(errors).toEqual([]);
  const savedRevision = revision;
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await add.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(revision).toBe(savedRevision);
});
