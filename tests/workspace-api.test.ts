import { expect, it } from "vitest";
import { createGoWorkspaceClient } from "../packages/api-client/src/workspace-api";
import { createGoApiClient } from "../packages/api-client/src/go-api";
import {
  emptyDocument,
  compactCheckpoint,
} from "../packages/document/src/index.mjs";
const design = {
  design_id: "design",
  workspace_id: "workspace",
  name: "Dinner",
  description: "",
  revision: 3,
  updated_at: "2026-11-04T00:00:00Z",
  created_at: "2026-11-04T00:00:00Z",
  pages: 2,
  status: "Draft",
  source_template_id: "template",
};
it("live workspace creates from a template and displays the actual revision thumbnail", async () => {
  const calls = [];
  const client = createGoWorkspaceClient(
    "https://api.test/",
    async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      return Response.json(
        init?.method === "POST" ? { designId: "design" } : design,
      );
    },
  );
  const result = await client.designs.create({
    name: "Dinner",
    template: "template",
    type: "Menu",
    pages: 1,
    status: "Draft",
  });
  expect(JSON.parse(calls[0].body as string)).toEqual({
    Name: "Dinner",
    Description: "",
    sourceTemplateId: "template",
  });
  expect(result.pages).toBe(2);
  expect(result.thumbnailUrl).toBe(
    "https://api.test/api/v1/designs/design/revisions/3/thumbnail",
  );
});
it("template catalog uses server previews and excludes templates without document revisions", async () => {
  const client = createGoWorkspaceClient("https://api.test", async () =>
    Response.json([
      {
        id: "ready",
        name: "Ready",
        description: "Menu",
        category: "CAFE",
        revision: 2,
        details: null,
      },
      {
        id: "empty",
        name: "Empty",
        description: "",
        category: "",
        revision: 0,
        details: null,
      },
    ]),
  );
  const templates = await client.templates.list();
  expect(templates.map((t) => t.id)).toEqual(["ready"]);
  expect(templates[0].thumbnailUrl).toContain(
    "/templates/ready/revisions/2/thumbnail",
  );
});
it("API schema preserves complete document session and unknown extension payloads", async () => {
  const doc = emptyDocument();
  doc.extensions["org.example.future"] = { kept: ["🌶️", "9007199254740993"] };
  doc.editorState = {
    version: 1,
    activePageId: "page_1",
    selectionIds: [],
    viewport: { zoom: 0.75, centerX: 306, centerY: 396 },
    panels: { activeTab: "assets", expandedNodeIds: [] },
    guidesVisible: true,
    rulersVisible: false,
    snapEnabled: true,
    history: { past: [], future: [] },
    preview: null,
    extensions: { "org.example.session": { kept: true } },
  };
  const checkpoint = compactCheckpoint(doc);
  const client = createGoApiClient("https://api.test", async () =>
    Response.json({
      ...design,
      document: {
        CreatedAt: design.created_at,
        DocumentVersion: 1,
        Document: checkpoint,
      },
    }),
  );
  expect((await client.designs.get("design")).document?.Document).toEqual(
    checkpoint,
  );
});

it("loads customer history and exact details with actual financial values", async () => {
  const snapshot = { id: "order", name: "Dinner", status: "Shipped", quantity: 200, total: 147.5,
    placedAt: "2026-11-05T12:00:00Z", updatedAt: "2026-11-05T13:00:00Z", customerName: "Jane",
    shippingAddress: ["Oak restaurant"], billingAddress: [], items: [], subtotal: 125, shipping: 10, tax: 12.5,
    payment: { status: "Paid", method: "Visa ending 1234" },
    delivery: { method: "Standard", estimate: "Nov 10", carrier: "Courier", tracking: "TRACK123" } };
  const calls: string[] = [];
  const client = createGoWorkspaceClient("https://api.test", async (url, init) => {
    calls.push(String(url));
    expect(init?.credentials).toBe("include");
    return Response.json(String(url).endsWith("/orders") ? [snapshot] : snapshot);
  });
  expect((await client.orders.list())[0]).toMatchObject({ qty: 200, status: "Shipped", total: 147.5 });
  expect(await client.orders.get("order")).toMatchObject({ shipping: 10, tax: 12.5, deliveryDetails: { tracking: "TRACK123" } });
  expect(calls).toEqual(["https://api.test/api/v1/orders", "https://api.test/api/v1/orders/order"]);
});
