import { z } from "zod";
import { GoApiError } from "./go-api";

export const addressSchema = z.object({
  company: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  country: z.string(),
});
export const checkoutSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  shipping: addressSchema,
  billing: addressSchema,
  billingSame: z.boolean(),
  reference: z.string(),
  notes: z.string(),
  approved: z.boolean(),
});
export const orderPartSchema = z.object({
  key: z.string(),
  designId: z.string(),
  designName: z.string(),
  revision: z.number().int(),
  componentId: z.string(),
  kind: z.enum(["cover", "paper"]),
  name: z.string(),
  unit: z.enum(["cover", "sheet"]),
  pageIds: z.array(z.string()).min(1),
  size: z.string(),
  sides: z.string(),
  paper: z.string(),
  finish: z.string(),
  production: z.record(z.string(), z.unknown()),
});
export const orderLineSchema = orderPartSchema.extend({
  id: z.string(),
  quantity: z.number().int().positive(),
  latestRevision: z.number().int(),
  available: z.boolean(),
});
export const orderDraftSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  items: orderLineSchema.array(),
  checkout: checkoutSchema,
  warnings: z.array(z.string()),
});
export const orderSourceSchema = z.object({
  designId: z.string(),
  name: z.string(),
  revision: z.number().int(),
  parts: orderPartSchema.array(),
});
export type OrderAddress = z.infer<typeof addressSchema>;
export type OrderCheckout = z.infer<typeof checkoutSchema>;
export type OrderPart = z.infer<typeof orderPartSchema>;
export type OrderLine = z.infer<typeof orderLineSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderSource = z.infer<typeof orderSourceSchema>;
export type DraftToken = { draftId: string; version: number };
export type OrderSelection = { key: string; quantity: number };
export const emptyAddress = (): OrderAddress => ({
  company: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Canada",
});
export const emptyCheckout = (): OrderCheckout => ({
  name: "",
  email: "",
  phone: "",
  shipping: emptyAddress(),
  billing: emptyAddress(),
  billingSame: true,
  reference: "",
  notes: "",
  approved: false,
});
export const draftToken = (draft: OrderDraft): DraftToken => ({
  draftId: draft.id,
  version: draft.version,
});

export function createOrderingClient(
  origin: string,
  fetcher: typeof fetch = fetch,
) {
  const base = origin.replace(/\/$/, "");
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetcher(`${base}/api/v1${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = new GoApiError(response.status);
      try {
        const data = await response.json();
        if (typeof data.message === "string") error.message = data.message;
      } catch {
        /* Keep the HTTP error. */
      }
      throw error;
    }
    return response.json();
  }
  return {
    draft: async () => orderDraftSchema.parse(await request("/order/draft")),
    parts: async (id: string, revision?: number) =>
      orderSourceSchema.parse(
        await request(
          `/order/designs/${encodeURIComponent(id)}/parts${revision ? `?revision=${revision}` : ""}`,
        ),
      ),
    add: async (
      token: DraftToken,
      designId: string,
      revision: number,
      parts: OrderSelection[],
    ) =>
      orderDraftSchema.parse(
        await request("/order/draft/items", "POST", {
          ...token,
          designId,
          revision,
          parts,
        }),
      ),
    quantity: async (token: DraftToken, id: string, quantity: number) =>
      orderDraftSchema.parse(
        await request(`/order/draft/items/${encodeURIComponent(id)}`, "PUT", {
          ...token,
          quantity,
        }),
      ),
    remove: async (token: DraftToken, id: string) =>
      orderDraftSchema.parse(
        await request(
          `/order/draft/items/${encodeURIComponent(id)}/remove`,
          "POST",
          token,
        ),
      ),
    refresh: async (token: DraftToken, id: string) =>
      orderDraftSchema.parse(
        await request(
          `/order/draft/items/${encodeURIComponent(id)}/refresh`,
          "POST",
          token,
        ),
      ),
    saveCheckout: async (token: DraftToken, checkout: OrderCheckout) =>
      orderDraftSchema.parse(
        await request("/order/draft/checkout", "PUT", { ...token, checkout }),
      ),
    submit: async (token: DraftToken, checkout: OrderCheckout) =>
      z
        .object({ id: z.string() })
        .parse(await request("/orders", "POST", { ...token, checkout })),
    reorder: async (token: DraftToken, id: string) =>
      orderDraftSchema.parse(
        await request(
          `/orders/${encodeURIComponent(id)}/reorder`,
          "POST",
          token,
        ),
      ),
    previewUrl: (id: string, pageId?: string) =>
      `${base}/api/v1/order/items/${encodeURIComponent(id)}/preview${pageId ? `?pageId=${encodeURIComponent(pageId)}` : ""}`,
    sourcePreviewUrl: (designId: string, revision: number, pageId: string) =>
      `${base}/api/v1/designs/${encodeURIComponent(designId)}/revisions/${revision}/thumbnail?pageId=${encodeURIComponent(pageId)}&width=480&view=committed`,
  };
}
export type OrderingClient = ReturnType<typeof createOrderingClient>;
