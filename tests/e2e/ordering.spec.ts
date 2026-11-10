import { expect, test } from "@playwright/test";
import { emptyCheckout } from "../../packages/api-client/src/ordering";

test.skip(
  process.env.VITE_DATA_SOURCE !== "api",
  "Run with VITE_DATA_SOURCE=api VITE_AUTH_SOURCE=api.",
);
const dinnerId = "019a4500-0000-7000-8000-000000000001",
  drinksId = "019a4500-0000-7000-8000-000000000002";
const draftId = "019a4500-0000-7000-8000-000000000003",
  orderId = "019a4500-0000-7000-8000-000000000004";
const part = (
  designId: string,
  designName: string,
  key: string,
  name: string,
  kind: "cover" | "paper",
) => ({
  designId,
  designName,
  key,
  name,
  kind,
  unit: kind === "cover" ? "cover" : "sheet",
  revision: 1,
  componentId: kind,
  pageIds: kind === "cover" ? ["front", "back"] : ["page1"],
  size: "210 × 297 mm",
  sides: kind === "cover" ? "All cover surfaces" : "Single-sided",
  paper: kind === "cover" ? "linen" : "uncoated",
  finish: kind === "cover" ? "foil" : "None",
  production: { kind, name },
});
const parts = {
  [dinnerId]: [
    part(dinnerId, "Dinner menu", "cover:cover", "Cover", "cover"),
    part(dinnerId, "Dinner menu", "paper:page1", "Menu page", "paper"),
  ],
  [drinksId]: [
    part(drinksId, "Drinks menu", "paper:page1", "Drinks page", "paper"),
  ],
};

async function setup(page: import("@playwright/test").Page) {
  let draft = {
    id: draftId,
    version: 0,
    items: [] as any[],
    checkout: emptyCheckout(),
    warnings: [] as string[],
  };
  let submitted: any;
  let conflict = false;
  const submissions: any[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (path.includes("/thumbnail") || path.includes("/preview"))
      return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" fill="#efe4d1"/><text x="10" y="50">MENU</text></svg>',
      });
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          UserId: dinnerId,
          EmailAddress: "owner@example.com",
          WorkspaceId: dinnerId,
          Role: "USER",
          Name: "Jane",
          Restaurant: "The Dinner Table",
          Status: "Active",
        },
      });
    if (path.endsWith("/assets/storage"))
      return route.fulfill({
        json: { limit_bytes: 100000, used_bytes: 0, reserved_bytes: 0 },
      });
    if (path.endsWith("/assets"))
      return route.fulfill({ json: { assets: [] } });
    if (path.endsWith("/templates")) return route.fulfill({ json: [] });
    if (path.endsWith("/designs"))
      return route.fulfill({
        json: [dinnerId, drinksId].map((id, i) => ({
          design_id: id,
          workspace_id: dinnerId,
          name: i ? "Drinks menu" : "Dinner menu",
          description: "",
          revision: 1,
          updated_at: "2026-11-09T00:00:00Z",
          created_at: "2026-11-09T00:00:00Z",
          pages: i ? 1 : 3,
          status: "Draft",
        })),
      });
    if (path.endsWith("/parts")) {
      const id = path.split("/").at(-2)!;
      return route.fulfill({
        json: {
          designId: id,
          name: id === dinnerId ? "Dinner menu" : "Drinks menu",
          revision: 1,
          parts: parts[id],
        },
      });
    }
    if (path.endsWith("/order/draft")) return route.fulfill({ json: draft });
    if (path.includes("/order/draft/")) {
      const body = request.postDataJSON();
      if (conflict) {
        conflict = false;
        draft.version++;
        return route.fulfill({
          status: 409,
          json: {
            message:
              "Your order changed in another window. Review the latest order and try again.",
          },
        });
      }
      expect(body.version).toBe(draft.version);
      if (path.endsWith("/items")) {
        for (const selected of body.parts)
          draft.items.push({
            ...parts[body.designId].find((p) => p.key === selected.key),
            id: `${draft.items.length + 1}`,
            quantity: selected.quantity,
            latestRevision: 1,
            available: true,
          });
      } else if (path.endsWith("/checkout"))
        draft.checkout = { ...body.checkout, approved: false };
      else if (path.endsWith("/remove"))
        draft.items = draft.items.filter(
          (item) => item.id !== path.split("/").at(-2),
        );
      else {
        const line = draft.items.find(
          (item) => item.id === path.split("/").at(-1),
        );
        if (line) line.quantity = body.quantity;
      }
      draft.version++;
      return route.fulfill({ json: draft });
    }
    if (path.endsWith("/orders") && request.method() === "POST") {
      const body = request.postDataJSON();
      submissions.push(body);
      submitted = {
        id: orderId,
        name: "Dinner menu + 1 more",
        status: "Pending",
        quantity: draft.items.reduce((n, i) => n + i.quantity, 0),
        total: null,
        placedAt: "2026-11-09T00:00:00Z",
        updatedAt: "2026-11-09T00:00:00Z",
        customerName: body.checkout.name,
        shippingAddress: [body.checkout.shipping.line1],
        billingAddress: [
          body.checkout.billingSame
            ? body.checkout.shipping.line1
            : body.checkout.billing.line1,
        ],
        items: draft.items.map((i) => ({ ...i, amount: null })),
        subtotal: null,
        shipping: null,
        tax: null,
        payment: { status: "Awaiting quote", method: "Invoice after approval" },
        delivery: {
          method: "Delivery",
          estimate: "Confirmed with quote",
          carrier: null,
          tracking: null,
        },
      };
      draft = {
        id: `${draftId}-new`,
        version: 0,
        items: [],
        checkout: emptyCheckout(),
        warnings: [],
      };
      return route.fulfill({ json: { id: orderId } });
    }
    if (path.endsWith(`/orders/${orderId}`))
      return route.fulfill({ json: submitted });
    if (path.endsWith("/orders"))
      return route.fulfill({ json: submitted ? [submitted] : [] });
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  return {
    submissions,
    conflict: () => {
      conflict = true;
    },
  };
}

test("orders different cover and page quantities across documents, then submits for approval", async ({
  page,
}, testInfo) => {
  const { submissions } = await setup(page);
  await page.goto("/designs");
  await page
    .locator(".doc-row")
    .filter({ hasText: "Dinner menu" })
    .getByRole("button", { name: "Add to order" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Cover quantity", { exact: true }).fill("10");
  await page.getByLabel("Menu page quantity", { exact: true }).fill("20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Dinner menu — Cover quantity")).toHaveValue(
    "10",
  );
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Drinks menu" })
    .click();
  await page.getByLabel("Drinks page quantity", { exact: true }).fill("15");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order$/);
  await page.reload();
  await expect(page.locator(".order-document")).toHaveCount(2);
  await expect(page.getByLabel("Dinner menu — Menu page quantity")).toHaveValue(
    "20",
  );
  await page.screenshot({
    path: `/tmp/sizzle-order-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await page.getByLabel("Contact name", { exact: true }).fill("Jane Doe");
  await page.getByLabel("Email", { exact: true }).fill("jane@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("4165551234");
  await page
    .getByLabel("Street address", { exact: true })
    .fill("1 Main Street");
  await page.getByLabel("City", { exact: true }).fill("Toronto");
  await page.getByLabel("Province / state / region").fill("ON");
  await page.getByLabel("Postal / ZIP code").fill("M1M 1M1");
  await page.getByRole("button", { name: "Continue to billing" }).click();
  await page.getByLabel("Purchase order / reference (optional)").fill("PO-123");
  await page.getByRole("button", { name: "Review order", exact: true }).click();
  await expect(
    page.getByText("10 covers · Cover", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("20 sheets · Menu page", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("15 sheets · Drinks page", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit order for approval" }),
  ).toBeDisabled();
  await page
    .getByLabel("I approve the selected artwork", { exact: false })
    .check();
  await page.getByRole("button", { name: "Submit order for approval" }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}\\?placed=1`));
  await expect(page.getByText("Your order has been submitted.")).toBeVisible();
  await expect(page.getByText("Awaiting quote").first()).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0].checkout).toMatchObject({
    approved: true,
    reference: "PO-123",
    name: "Jane Doe",
    shipping: { line1: "1 Main Street" },
  });
  expect(submissions[0]).not.toHaveProperty("total");
});

test("keeps the order reviewable after another workspace member changes it", async ({
  page,
}) => {
  const control = await setup(page);
  await page.goto(`/order?design=${dinnerId}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  control.conflict();
  await page.getByLabel("Dinner menu — Cover quantity").fill("8");
  await page.getByLabel("Dinner menu — Cover quantity").blur();
  await expect(page.getByRole("alert")).toContainText(
    "changed in another window",
  );
  await expect(page.getByLabel("Dinner menu — Cover quantity")).toHaveValue(
    "1",
  );
  await expect(
    page.getByRole("button", { name: "Continue to checkout" }),
  ).toBeEnabled();
});
