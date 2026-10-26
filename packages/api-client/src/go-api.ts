import { z } from "zod";

// Matches the currently checked-in sizzle-go-api controllers and JSON DTOs.
const documentSchema = z
  .object({
    Document: z.record(z.string(), z.unknown()),
    DocumentVersion: z.number(),
    CreatedAt: z.string(),
  })
  .passthrough();
export const goDesignSchema = z.object({
  design_id: z.string(),
  workspace_id: z.number(),
  name: z.string(),
  description: z.string(),
  document: documentSchema.optional(),
  updated_at: z.string(),
  created_at: z.string(),
});
export const goAssetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number(),
  state: z.string(),
  created_at: z.string(),
});
const signedUrlSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()),
  expires_in: z.number(),
});
export type GoDesign = z.infer<typeof goDesignSchema>;
export type GoAsset = z.infer<typeof goAssetSchema>;
export interface GoDesignInput {
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
  ): Promise<unknown> {
    const response = await fetcher(`${origin.replace(/\/$/, "")}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new GoApiError(response.status);
    return response.status === 204 ? undefined : response.json();
  }
  return {
    me: async () =>
      z
        .object({
          EmailAddress: z.string(),
          WorkspaceId: z.number(),
          Role: z.string(),
        })
        .parse(await request("/api/v1/me")),
    designs: {
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
        Document: Record<string, unknown>,
        DocumentVersion: number,
      ) => {
        await request(
          `/api/v1/designs/${encodeURIComponent(id)}/document`,
          "POST",
          { Document, DocumentVersion },
        );
      },
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
