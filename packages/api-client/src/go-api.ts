import { z } from "zod";
import { validate, type SizzleDocument } from "@sizzle/document";
export const sizzleDocumentSchema = z.unknown().transform((value) => {
  validate(value);
  return value as SizzleDocument;
});

// Matches the currently checked-in sizzle-go-api controllers and JSON DTOs.
const documentSchema = z
  .object({
    Document: sizzleDocumentSchema,
    DocumentVersion: z.number(),
    CreatedAt: z.string(),
  })
  .passthrough();
export const goDesignSchema = z.object({
  source_template_id: z.string().optional(),
  pages: z.number().int().positive().optional(),
  status: z.string().optional(),
  revision: z.number().int().nonnegative(),
  design_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string(),
  document: documentSchema.optional(),
  updated_at: z.string(),
  created_at: z.string(),
});
export const goAssetSchema = z.object({
  resource: z.record(z.string(), z.unknown()).optional(),
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number(),
  state: z.string(),
  created_at: z.string(),
});
export const goOrderSchema = z.object({
  id: z.string(), name: z.string(), quantity: z.number(), total: z.number().nullable(),
  status: z.enum(["Pending", "In production", "Shipped", "Delivered", "Cancelled"]),
  placedAt: z.string(), updatedAt: z.string(), customerName: z.string(),
  shippingAddress: z.array(z.string()), billingAddress: z.array(z.string()),
  items: z.array(z.object({ id: z.string().optional(), designId: z.string().optional(), designName: z.string().optional(), revision: z.number().optional(), unit: z.string().optional(), pageIds: z.array(z.string()).optional(), production: z.record(z.string(),z.unknown()).optional(), name: z.string(), quantity: z.number(), size: z.string(), sides: z.string(), paper: z.string(), finish: z.string(), amount: z.number().nullable() })),
  subtotal: z.number().nullable(), shipping: z.number().nullable(), tax: z.number().nullable(),
  payment: z.object({ status: z.string(), method: z.string() }),
  delivery: z.object({ method: z.string(), estimate: z.string(), carrier: z.string().nullable(), tracking: z.string().nullable() }),
});
export type GoOrder = z.infer<typeof goOrderSchema>;
const signedUrlSchema = z.object({
  url: z.string().url(),
  headers: z
    .record(z.string(), z.string())
    .nullable()
    .transform((value) => value || {}),
  expires_in: z.number(),
});
export type GoDesign = z.infer<typeof goDesignSchema>;
export type GoAsset = z.infer<typeof goAssetSchema>;
export interface GoDesignInput {
  sourceTemplateId?: string;
  Name: string;
  Description: string;
}
export interface GoUploadRequest {
  filename: string;
  content_type: string;
  size_bytes: number;
}
export class GoApiError extends Error {
  constructor(public status: number) {
    super(`Go API request failed (${status}).`);
  }
}
export function createGoApiClient(
  origin: string,
  fetcher: typeof fetch = fetch,
) {
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    noContent = false,
  ): Promise<unknown> {
    const response = await fetcher(`${origin.replace(/\/$/, "")}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new GoApiError(response.status);
    return noContent || response.status === 204 ? undefined : response.json();
  }
  return {
    orders: {
      list: async () => goOrderSchema.array().parse(await request("/api/v1/orders")),
      get: async (id: string) => goOrderSchema.parse(await request(`/api/v1/orders/${encodeURIComponent(id)}`)),
    },
    auth: {
      logout: async () => { await request("/logout", "POST", undefined, true); },
      login: async (emailAddress: string, password: string) => {
        await request("/login", "POST", { emailAddress, password }, true);
      },
      register: async (emailAddress: string, password: string) => {
        await request("/register", "POST", { emailAddress, password }, true);
      },
      googleUrl: `${origin.replace(/\/$/, "")}/login/google`,
    },
    me: async () =>
      z
        .object({
          EmailAddress: z.string(),
          WorkspaceId: z.string(),
          Role: z.string(),
          UserId: z.string(), Name: z.string(), Restaurant: z.string(), Status: z.string(),
        })
        .parse(await request("/api/v1/me")),
    designs: {
      duplicate: async (id: string) =>
        goDesignSchema.parse(
          await request(
            `/api/v1/designs/${encodeURIComponent(id)}/duplicate`,
            "POST",
          ),
        ),
      restore: async (id: string) =>
        goDesignSchema.parse(
          await request(
            `/api/v1/designs/${encodeURIComponent(id)}/restore`,
            "POST",
          ),
        ),
      list: async () =>
        goDesignSchema
          .array()
          .nullable()
          .transform((value) => value || [])
          .parse(await request("/api/v1/designs")),
      get: async (id: string) =>
        goDesignSchema.parse(
          await request(`/api/v1/design/${encodeURIComponent(id)}`),
        ),
      create: async (input: GoDesignInput) =>
        z
          .object({ designId: z.string() })
          .parse(await request("/api/v1/designs", "POST", input)),
      update: async (id: string, input: GoDesignInput) => {
        await request(
          `/api/v1/designs/${encodeURIComponent(id)}`,
          "PUT",
          input,
        );
      },
      remove: async (id: string) => {
        await request(`/api/v1/designs/${encodeURIComponent(id)}`, "DELETE");
      },
      saveDocument: async (
        id: string,
        Document: SizzleDocument,
        DocumentVersion: number,
        revision: number,
      ) => {
        return z
          .object({
            revision: z.number().int().nonnegative(),
            document: sizzleDocumentSchema,
          })
          .parse(
            await request(
              `/api/v1/designs/${encodeURIComponent(id)}/document`,
              "POST",
              { Document, DocumentVersion, revision },
            ),
          );
      },
    },
    documents: {
      resolve: async (id: string, revision: number) =>
        request(
          `/api/v1/designs/${encodeURIComponent(id)}/resources/resolve`,
          "POST",
          { revision },
        ),
      thumbnailUrl: (id: string, revision: number, pageId?: string) =>
        `${origin.replace(/\/$/, "")}/api/v1/designs/${encodeURIComponent(id)}/revisions/${revision}/thumbnail${pageId ? "?pageId=" + encodeURIComponent(pageId) : ""}`,
    },
    templates: {
      list: async () =>
        z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string(),
              category: z.string(),
              revision: z.number().int().nonnegative(),
              details: z.record(z.string(), z.unknown()).nullable(),
            }),
          )
          .parse(await request("/api/v1/templates")),
      get: async (id: string) =>
        goDesignSchema.parse(
          await request(`/api/v1/templates/${encodeURIComponent(id)}`),
        ),
    },
    assets: {
      list: async () =>
        z
          .object({ assets: goAssetSchema.array().nullable() })
          .parse(await request("/api/v1/assets")).assets || [],
      storage: async () =>
        z
          .object({
            limit_bytes: z.number(),
            used_bytes: z.number(),
            reserved_bytes: z.number(),
          })
          .parse(await request("/api/v1/assets/storage")),
      beginUpload: async (input: GoUploadRequest) =>
        z
          .object({ asset: goAssetSchema, upload: signedUrlSchema })
          .parse(await request("/api/v1/assets", "POST", input)),
      completeUpload: async (id: string) =>
        goAssetSchema.parse(
          await request(
            `/api/v1/assets/${encodeURIComponent(id)}/complete`,
            "POST",
          ),
        ),
      download: async (id: string) =>
        signedUrlSchema.parse(
          await request(`/api/v1/assets/${encodeURIComponent(id)}/download`),
        ),
      remove: async (id: string) => {
        await request(`/api/v1/assets/${encodeURIComponent(id)}`, "DELETE");
      },
    },
  };
}
