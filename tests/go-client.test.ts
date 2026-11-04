import { expect, it } from "vitest";
import { createGoApiClient } from "../packages/api-client/src";
import { emptyDocument } from "../packages/document/src/index.mjs";
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
it("sends the loaded revision and returns the new revision", async () => {
  const document = emptyDocument("Menu");
  const client = createGoApiClient("https://api.test", async (_url, init) => {
    expect(JSON.parse(init!.body as string)).toEqual({
      Document: document,
      DocumentVersion: 1,
      revision: 12,
    });
    return Response.json({ revision: 13, document });
  });
  expect(await client.designs.saveDocument("design", document, 1, 12)).toEqual({
    revision: 13,
    document,
  });
});
it("surfaces a stale document as a 409 error", async () => {
  const client = createGoApiClient("https://api.test", async () =>
    Response.json({ code: "revision_conflict" }, { status: 409 }),
  );
  await expect(
    client.designs.saveDocument("design", emptyDocument(), 1, 12),
  ).rejects.toMatchObject({ status: 409 });
});
