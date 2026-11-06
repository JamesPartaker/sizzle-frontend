import { expect, test } from "@playwright/test";

test.skip(process.env.VITE_AUTH_SOURCE !== "api", "Run with VITE_AUTH_SOURCE=api to exercise the Go auth integration.");

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/me", route => route.fulfill({ json: {
    UserId: "owner", EmailAddress: "owner@example.com", WorkspaceId: "workspace", Role: "USER", Name: "Owner", Restaurant: "Restaurant", Status: "Active",
  } }));
});

for (const mode of ["login", "register"]) {
  test(`${mode} handles a server error, then a cookie-session success`, async ({ page }) => {
    const payloads: unknown[] = [];
    await page.route(`**/${mode}`, async route => {
      if (route.request().method() !== "POST") return route.continue();
      payloads.push(route.request().postDataJSON());
      const status = payloads.length === 1 ? (mode === "login" ? 401 : 409) : (mode === "login" ? 204 : 201);
      await route.fulfill({ status });
    });
    await page.goto(`/${mode}`);
    await page.getByLabel("Email address").fill("owner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    const submit = page.getByRole("button", { name: mode === "login" ? "Sign in" : "Create your account", exact: true });
    await submit.click();
    await expect(page.getByRole("alert")).toContainText(mode === "login" ? "don’t match" : "couldn’t create");
    await expect(page).toHaveURL(new RegExp(`/${mode}$`));
    await submit.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(payloads).toEqual(Array(2).fill({ emailAddress: "owner@example.com", password: "test-password" }));
  });
}
