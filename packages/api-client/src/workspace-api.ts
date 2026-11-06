import { createGoApiClient, type GoOrder, type GoDesign } from "./go-api";
import type { SizzleClient } from "./index";
import type { Design, Template, PrintOrder } from "@sizzle/schemas";

/** Production workspace adapter to the same versioned API used by the editor. */
export function createGoWorkspaceClient(
  origin: string,
  fetcher: typeof fetch = fetch,
): SizzleClient {
  const go = createGoApiClient(origin, fetcher),
    base = origin.replace(/\/$/, "");
  const design = (d: GoDesign): Design => ({
    id: d.design_id,
    name: d.name,
    template: d.source_template_id || "",
    type: "Menu",
    edited: Date.parse(d.updated_at),
    pages: d.document?.Document.pages.length || d.pages || 1,
    status: d.status || "Draft",
    revision: d.revision,
    thumbnailUrl: d.revision
      ? go.documents.thumbnailUrl(d.design_id, d.revision)
      : undefined,
  });
  const order = (o: GoOrder): PrintOrder => ({
    id: o.id, name: o.name, template: "", qty: o.quantity, date: o.placedAt,
    status: o.status, total: o.total, delivery: o.delivery.estimate,
    paper: o.items[0]?.paper || "", items: o.items,
    subtotal: o.subtotal, shipping: o.shipping, tax: o.tax,
    shippingAddress: o.shippingAddress, billingAddress: o.billingAddress,
    payment: o.payment, deliveryDetails: o.delivery,
  });
  return {
    designs: {
      list: async () => (await go.designs.list()).map(design),
      create: async (input) => {
        const result = await go.designs.create({
          Name: input.name,
          Description: "",
          ...(input.template ? { sourceTemplateId: input.template } : {}),
        });
        return design(await go.designs.get(result.designId));
      },
      rename: async (id, name) => {
        const old = await go.designs.get(id);
        await go.designs.update(id, {
          Name: name,
          Description: old.description,
        });
        return design(await go.designs.get(id));
      },
      duplicate: async (id) => design(await go.designs.duplicate(id)),
      remove: go.designs.remove,
      restore: async (input) => design(await go.designs.restore(input.id)),
    },
    templates: {
      list: async () =>
        (await go.templates.list())
          .filter((t) => t.revision > 0)
          .map((t): Template => ({
            id: t.id,
            name: t.name,
            style: String(t.details?.style || t.category || "Menu"),
            type: "Menu",
            color: t.details?.palette === "Cool" ? "Cool" : "Warm",
            tag: t.description,
            title: t.name,
            kicker: "",
            sub: t.description,
            section: "",
            items: [],
            footer: "",
            revision: t.revision,
            thumbnailUrl: `${base}/api/v1/templates/${encodeURIComponent(t.id)}/revisions/${t.revision}/thumbnail`,
          })),
    },
    assets: {
      list: async () =>
        (await go.assets.list()).map((a) => ({
          id: a.id,
          name: a.filename,
          type: a.content_type.startsWith("font/") ? "Fonts" : "Images",
          size: String(a.size_bytes),
        })),
      upload: async () => {
        throw new Error("Use the workspace asset upload service");
      },
    },
    orders: {
      list: async () => (await go.orders.list()).map(order),
      get: async (id) => order(await go.orders.get(id)),
    },
  };
}
