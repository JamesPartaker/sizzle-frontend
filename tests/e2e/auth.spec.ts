import { expect, test } from "@playwright/test";

test.skip(process.env.VITE_AUTH_SOURCE === "api", "This test covers the demo account pages.");

test("account routes switch outside the workspace shell and do not load workspace data", async ({ page }) => {
  const dataRequests: string[] = [];
  page.on("request", request => {
    if (/\/(designs|templates|assets|orders)$/.test(new URL(request.url()).pathname)) dataRequests.push(request.url());
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Good to see you again." })).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.getByRole("link", { name: "Create an account ↗", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Create your account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No account was created or signed in");
  await expect(page).toHaveURL(/\/register$/);
  expect(dataRequests).toEqual([]);
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
  await page.getByRole("link", { name: "Sign in ↗", exact: true }).first().click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Password reset is not available yet");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Explore the demo workspace" }).click();
  await expect(page.locator(".sidebar")).toBeAttached();
});
