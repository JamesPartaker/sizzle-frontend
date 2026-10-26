import { describe, expect, it } from "vitest";
import {
  createDemoClient,
  createHttpClient,
  fixtures,
} from "../packages/api-client/src";
import type { StorageAdapter } from "../packages/api-client/src";
function memory(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
describe("workspace persistence", () => {
  it("creates, renames, duplicates, deletes, restores, and survives a new client", async () => {
    const storage = memory(),
      client = createDemoClient(storage);
    const created = await client.designs.create({
      name: "Dinner",
      template: "sunday",
      type: "Food menu",
      pages: 2,
      status: "Draft",
    });
    expect((await client.designs.list())[0].id).toBe(created.id);
    await client.designs.rename(created.id, "  Autumn Dinner  ");
    const copy = await client.designs.duplicate(created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toBe("Autumn Dinner (copy)");
    await client.designs.remove(copy.id);
    expect((await client.designs.list()).some((d) => d.id === copy.id)).toBe(
      false,
    );
    await client.designs.restore(copy);
    expect(
      (await createDemoClient(storage).designs.list()).find(
        (d) => d.id === copy.id,
      ),
    ).toEqual(copy);
  });
  it("rejects invalid renames without changing persisted data", async () => {
    const client = createDemoClient(memory());
    await expect(
      client.designs.rename(fixtures.designs[0].id, "   "),
    ).rejects.toThrow();
    expect((await client.designs.list())[0].name).toBe(
      fixtures.designs[0].name,
    );
  });
  it("reports storage failures without claiming a design was created", async () => {
    const client = createDemoClient({
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    });
    await expect(
      client.designs.create({
        name: "Dinner",
        template: "sunday",
        type: "Food menu",
        pages: 1,
        status: "Draft",
      }),
    ).rejects.toThrow("Quota exceeded");
    expect(await client.designs.list()).toHaveLength(fixtures.designs.length);
  });
  it("persists uploads without modifying the default brand assets", async () => {
    const storage = memory(),
      client = createDemoClient(storage);
    const file = await client.assets.upload({
      name: "test.png",
      type: "Images",
      size: "PNG · 1 KB",
      data: "data:image/png;base64,AA==",
    });
    expect((await createDemoClient(storage).assets.list())[0]).toEqual(file);
    expect(fixtures.assets).toHaveLength(4);
  });
});
describe("typed HTTP contract", () => {
  it("uses cookies and rejects malformed server responses", async () => {
    let credentials: RequestCredentials | undefined;
    const client = createHttpClient(
      "https://example.test/api",
      async (_url, init) => {
        credentials = init?.credentials;
        return new Response(JSON.stringify([{ id: "broken" }]), {
          status: 200,
        });
      },
    );
    await expect(client.designs.list()).rejects.toThrow();
    expect(credentials).toBe("include");
  });
  it("surfaces authorization failures instead of falling back to demo records", async () => {
    const client = createHttpClient(
      "https://example.test",
      async () => new Response(null, { status: 401 }),
    );
    await expect(client.orders.list()).rejects.toMatchObject({ status: 401 });
  });
});
