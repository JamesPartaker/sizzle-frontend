export type Kind = "templates" | "designs" | "users" | "orders";
export const statuses: Record<Kind, string[]> = {
  templates: ["Published", "Draft", "Archived"],
  designs: ["Draft", "Ready to print", "Archived"],
  users: ["Active", "Invited", "Suspended"],
  orders: ["Pending", "In production", "Shipped", "Delivered", "Cancelled"],
};
export interface AdminRecord {
  id: string; name: string; email: string; restaurant: string;
  status: string; updatedAt: string; type: string; quantity: number; total: number | null;
}
export interface UserDetails {
  id: string; name: string; email: string; restaurant: string; status: string;
  createdAt: string; updatedAt: string; lastSignInAt: string | null; role: string;
}
export interface TemplateDetails {
  id: string; name: string; status: string; type: string;
  description: string; style: string; palette: string; tags: string[];
  createdAt: string; updatedAt: string; author: string; version: number;
  pages: number; widthMm: number; heightMm: number; orientation: string;
  bleedMm: number; fonts: string[]; usageCount: number;
}
export interface DesignDetails {
  id: string; name: string; status: string; type: string;
  description: string; createdAt: string; updatedAt: string; version: number;
  pages: number; widthMm: number; heightMm: number; orientation: string;
  owner: { id: string; name: string; email: string; restaurant: string };
  template: { id: string; name: string };
  documentId: string;
}
export interface OrderDetails extends AdminRecord {
  customerName: string;
  phone: string;
  placedAt: string;
  shippingAddress: string[];
  billingAddress: string[];
  items: { id?: string; designId: string; designName?: string; revision?: number; unit?: string; production?: Record<string, unknown>; name: string; quantity: number; size: string; sides: string; paper: string; finish: string; amount: number | null }[];
  subtotal: number | null;
  shipping: number | null;
  tax: number | null;
  reference?: string;
  payment: { status: string; method: string; reference: string };
  delivery: { method: string; estimate: string; carrier: string | null; tracking: string | null };
  notes: string;
}
export interface SearchRequest {
  q: string; status: string; limit: 25 | 50 | 100;
  page: number;
  sort: "updated_desc" | "name_asc";
}
export interface SearchPage { items: AdminRecord[]; totalItems: number }
export interface AdminRepository {
  search(kind: Kind, request: SearchRequest, signal: AbortSignal): Promise<SearchPage>;
  updateUser(id: string, details: Pick<AdminRecord, "name" | "email" | "restaurant" | "status">): Promise<void>;
  getUser(id: string, signal: AbortSignal): Promise<UserDetails | null>;
  getTemplate(id: string, signal: AbortSignal): Promise<TemplateDetails | null>;
  getDesign(id: string, signal: AbortSignal): Promise<DesignDetails | null>;
  getOrder(id: string, signal: AbortSignal): Promise<OrderDetails | null>;
  updateOrderStatus(id: string, status: string): Promise<void>;
}
const base = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:1323" : window.location.origin)).replace(/\/$/, "");
export const orderedArtworkUrl = (orderId: string, lineId: string) => `${base}/api/v1/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(lineId)}/artwork`;
async function request<T>(path: string, signal?: AbortSignal, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/v1/admin${path}`, {
    method, credentials: "include", cache: "no-store", signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "Sign in to Sizzle to access administration."
      : response.status === 403 ? "Administrator access is required."
      : `Request failed (${response.status}). Please try again.`);
    throw Object.assign(error, { status: response.status });
  }
  return response.status === 204 ? undefined as T : response.json();
}
async function detail<T>(kind: Kind, id: string, signal: AbortSignal): Promise<T | null> {
  try { return await request<T>(`/${kind}/${encodeURIComponent(id)}`, signal); }
  catch (error) { if ((error as { status?: number }).status === 404) return null; throw error; }
}
export const adminRepository: AdminRepository = {
  search: (kind, input, signal) => request(`/${kind}?${new URLSearchParams({
    q: input.q, status: input.status, limit: String(input.limit), page: String(input.page), sort: input.sort,
  })}`, signal),
  getUser: (id, signal) => detail("users", id, signal),
  getTemplate: (id, signal) => detail("templates", id, signal),
  getDesign: (id, signal) => detail("designs", id, signal),
  getOrder: (id, signal) => detail("orders", id, signal),
  updateUser: (id, input) => request(`/users/${encodeURIComponent(id)}`, undefined, "PUT", input),
  updateOrderStatus: (id, status) => request(`/orders/${encodeURIComponent(id)}/status`, undefined, "PUT", { status }),
};
