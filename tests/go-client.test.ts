import { expect, it } from "vitest";
import { createGoApiClient } from "../packages/api-client/src";
it("matches the current Go create response and PUT update route", async () => {
  const calls: {
    path: string;
    method: string;
    body?: string;
    credentials?: RequestCredentials;
  }[] = [];
  const client = createGoApiClient(
    "http://localhost:8080",
    async (url, init) => {
      calls.push({
        path: String(url),
        method: init?.method || "GET",
        body: init?.body as string | undefined,
        credentials: init?.credentials,
      });
      return init?.method === "POST"
        ? new Response(JSON.stringify({ designId: "abc123" }), { status: 201 })
        : new Response(null, { status: 204 });
    },
  );
  expect(
    await client.designs.create({ Name: "Dinner", Description: "" }),
  ).toEqual({ designId: "abc123" });
  await client.designs.update("abc123", {
    Name: "Dinner revised",
    Description: "",
  });
  expect(calls[0]).toMatchObject({
    path: "http://localhost:8080/api/v1/designs",
    method: "POST",
    credentials: "include",
  });
  expect(calls[1]).toMatchObject({
    path: "http://localhost:8080/api/v1/designs/abc123",
    method: "PUT",
  });
  expect(JSON.parse(calls[1].body!)).toEqual({
    Name: "Dinner revised",
    Description: "",
  });
});
it("handles Go list responses with a null assets array", async () => {
  const client = createGoApiClient(
    "http://localhost:8080",
    async () => new Response(JSON.stringify({ assets: null }), { status: 200 }),
  );
  expect(await client.assets.list()).toEqual([]);
});
