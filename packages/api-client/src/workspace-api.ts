import { createGoApiClient, type GoDesign } from "./go-api";
import type { SizzleClient } from "./index";
import type { Design, Template } from "@sizzle/schemas";

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
      list: async () => {
        const response = await fetcher(`${base}/orders`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Order service is unavailable");
        return response.json();
      },
    },
  };
}
