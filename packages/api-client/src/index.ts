import {
  designSchema,
  designNameSchema,
  templateSchema,
  assetSchema,
  orderSchema,
} from "@sizzle/schemas";
import type {
  Design,
  Template,
  BrandAsset,
  PrintOrder,
  NewDesign,
  NewAsset,
} from "@sizzle/schemas";
import * as fixtures from "./fixtures";
export { fixtures };

export interface SizzleClient {
  designs: {
    list(): Promise<Design[]>;
    create(input: NewDesign): Promise<Design>;
    rename(id: string, name: string): Promise<Design>;
    duplicate(id: string): Promise<Design>;
    remove(id: string): Promise<void>;
    restore(design: Design): Promise<Design>;
  };
  templates: { list(): Promise<Template[]> };
  assets: {
    list(): Promise<BrandAsset[]>;
    upload(input: NewAsset): Promise<BrandAsset>;
  };
  orders: { list(): Promise<PrintOrder[]> };
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
/** REST adapter. Endpoints below are an explicit integration contract, not a claim about the Go server. */
export function createHttpClient(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): SizzleClient {
  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok)
      throw new ApiError(
        `Request failed (${response.status}). Please try again.`,
        response.status,
      );
    return response.status === 204 ? undefined : response.json();
  };
  return {
    designs: {
      list: async () => designSchema.array().parse(await request("/designs")),
      create: async (input) =>
        designSchema.parse(await request("/designs", "POST", input)),
      rename: async (id, name) =>
        designSchema.parse(
          await request(`/designs/${encodeURIComponent(id)}`, "PATCH", {
            name: designNameSchema.parse(name),
          }),
        ),
      duplicate: async (id) =>
        designSchema.parse(
          await request(`/designs/${encodeURIComponent(id)}/duplicate`, "POST"),
        ),
      remove: async (id) => {
        await request(`/designs/${encodeURIComponent(id)}`, "DELETE");
      },
      restore: async (design) =>
        designSchema.parse(
          await request(
            `/designs/${encodeURIComponent(design.id)}/restore`,
            "POST",
            design,
          ),
        ),
    },
    templates: {
      list: async () =>
        templateSchema.array().parse(await request("/templates")),
    },
    assets: {
      list: async () => assetSchema.array().parse(await request("/assets")),
      upload: async (input) =>
        assetSchema.parse(await request("/assets", "POST", input)),
    },
    orders: {
      list: async () => orderSchema.array().parse(await request("/orders")),
    },
  };
}
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Browser-local implementation for the exported prototype. Never silently switches from live API to demo. */
export function createDemoClient(storage: StorageAdapter): SizzleClient {
  function read<T>(key: string, fallback: T, parse: (value: unknown) => T): T {
    try {
      const raw = storage.getItem(key);
      return raw ? parse(JSON.parse(raw)) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }
  const allDesigns = () =>
    read("sizzle-docs", fixtures.designs, (value) =>
      designSchema.array().parse(value),
    );
  const allUploads = () =>
    read<BrandAsset[]>("sizzle-assets", [], (value) =>
      assetSchema.array().parse(value),
    );
  const save = (designs: Design[]) =>
    storage.setItem("sizzle-docs", JSON.stringify(designs));
  const requireDesign = (id: string) => {
    const design = allDesigns().find((d) => d.id === id);
    if (!design) throw new ApiError("Design not found.", 404);
    return design;
  };
  return {
    designs: {
      list: async () => allDesigns(),
      create: async (input) => {
        const design = designSchema.parse({
          ...input,
          id: crypto.randomUUID(),
          edited: Date.now(),
        });
        save([design, ...allDesigns()]);
        return design;
      },
      rename: async (id, name) => {
        const design = {
          ...requireDesign(id),
          name: designNameSchema.parse(name),
          edited: Date.now(),
        };
        save(allDesigns().map((d) => (d.id === id ? design : d)));
        return design;
      },
      duplicate: async (id) => {
        const original = requireDesign(id);
        const copy = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} (copy)`.slice(0, 80),
          status: "Draft",
          edited: Date.now(),
        };
        save([copy, ...allDesigns()]);
        return copy;
      },
      remove: async (id) => {
        requireDesign(id);
        save(allDesigns().filter((d) => d.id !== id));
      },
      restore: async (input) => {
        const design = designSchema.parse(input);
        const current = allDesigns();
        if (!current.some((d) => d.id === design.id))
          save([design, ...current]);
        return design;
      },
    },
    templates: { list: async () => structuredClone(fixtures.templates) },
    assets: {
      list: async () => [...allUploads(), ...structuredClone(fixtures.assets)],
      upload: async (input) => {
        const asset = assetSchema.parse({ ...input, id: crypto.randomUUID() });
        storage.setItem(
          "sizzle-assets",
          JSON.stringify([asset, ...allUploads()]),
        );
        return asset;
      },
    },
    orders: { list: async () => structuredClone(fixtures.orders) },
  };
}
export {
  createGoApiClient,
  GoApiError,
  goDesignSchema,
  goAssetSchema,
} from "./go-api";
export type {
  GoDesign,
  GoAsset,
  GoDesignInput,
  GoUploadRequest,
} from "./go-api";
