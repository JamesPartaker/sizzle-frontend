import { expect, it, vi } from "vitest";
import { createGoApiClient, GoApiError } from "../packages/api-client/src/go-api";

it("uses Go credential fields and accepts empty login and registration responses", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  const client = createGoApiClient("https://api.example.test/", fetcher);
  await client.auth.login("owner@example.com", "test-password");
  await client.auth.register("owner@example.com", "test-password");
  for (const [index, endpoint] of ["login", "register"].entries()) {
    expect(fetcher.mock.calls[index]).toEqual([
      `https://api.example.test/${endpoint}`,
      expect.objectContaining({
        method: "POST", credentials: "include",
        body: JSON.stringify({ emailAddress: "owner@example.com", password: "test-password" }),
        headers: { "Content-Type": "application/json" },
      }),
    ]);
  }
  expect(client.auth.googleUrl).toBe("https://api.example.test/login/google");
});

it.each([401, 409, 500])("surfaces auth failure %i without a demo fallback", async (status) => {
  const client = createGoApiClient("https://api.example.test", async () => new Response(null, { status }));
  await expect(client.auth.login("owner@example.com", "test-password")).rejects.toMatchObject({ status });
  await expect(client.auth.register("owner@example.com", "test-password")).rejects.toBeInstanceOf(GoApiError);
});
