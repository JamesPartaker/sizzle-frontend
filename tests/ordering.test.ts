import { expect, it } from "vitest";
import {
  createOrderingClient,
  emptyCheckout,
  draftToken,
  GoApiError,
} from "../packages/api-client/src/index";

it("shares versioned workspace drafts and preserves separately ordered part quantities", async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const draft = {
    id: "draft",
    version: 2,
    items: [],
    checkout: emptyCheckout(),
    warnings: [],
  };
  const api = createOrderingClient("https://api.test/", async (url, init) => {
    calls.push({ path: String(url), init });
    return Response.json(draft);
  });
  const loaded = await api.draft();
  await api.add(draftToken(loaded), "dinner", 7, [
    { key: "cover:cover1", quantity: 10 },
    { key: "paper:page1", quantity: 20 },
  ]);
  expect(calls[0].path).toBe("https://api.test/api/v1/order/draft");
  expect(
    calls.every(
      (call) =>
        call.init?.credentials === "include" && call.init.cache === "no-store",
    ),
  ).toBe(true);
  expect(JSON.parse(calls[1].init!.body as string)).toEqual({
    draftId: "draft",
    version: 2,
    designId: "dinner",
    revision: 7,
    parts: [
      { key: "cover:cover1", quantity: 10 },
      { key: "paper:page1", quantity: 20 },
    ],
  });
});

it("submits the reviewed draft for approval and surfaces server conflicts", async () => {
  const calls: unknown[] = [];
  const api = createOrderingClient("https://api.test", async (_url, init) => {
    calls.push(JSON.parse(init!.body as string));
    return calls.length === 1
      ? Response.json({ message: "Review the updated order." }, { status: 409 })
      : Response.json({ id: "submitted" });
  });
  const checkout = { ...emptyCheckout(), approved: true };
  await expect(
    api.submit({ draftId: "draft", version: 1 }, checkout),
  ).rejects.toMatchObject({
    status: 409,
    message: "Review the updated order.",
  });
  expect(await api.submit({ draftId: "draft", version: 2 }, checkout)).toEqual({
    id: "submitted",
  });
  expect(calls[1]).toEqual({ draftId: "draft", version: 2, checkout });
  expect(calls[1]).not.toHaveProperty("total");
});

it("keeps authentication failures typed for redirect handling", async () => {
  const api = createOrderingClient(
    "",
    async () => new Response("", { status: 401 }),
  );
  await expect(api.draft()).rejects.toBeInstanceOf(GoApiError);
});
