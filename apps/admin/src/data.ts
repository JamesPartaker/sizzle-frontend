export type Kind = "templates" | "designs" | "users" | "orders";
export const statuses: Record<Kind, string[]> = {
  templates: ["Published", "Draft", "Archived"],
  designs: ["Draft", "Ready to print", "Archived"],
  users: ["Active", "Invited", "Suspended"],
  orders: ["Pending", "In production", "Shipped", "Delivered", "Cancelled"],
};
export interface AdminRecord {
  id: string; name: string; email: string; restaurant: string;
  status: string; updatedAt: string; type: string; quantity: number; total: number;
}
export interface OrderDetails extends AdminRecord {
  customerName: string;
  phone: string;
  placedAt: string;
  shippingAddress: string[];
  billingAddress: string[];
  items: { designId: string; name: string; quantity: number; size: string; sides: string; paper: string; finish: string; amount: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
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
  getOrder(id: string, signal: AbortSignal): Promise<OrderDetails | null>;
  updateOrderStatus(id: string, status: string): Promise<void>;
}
const restaurants = ["Sunday Table", "Olive & Oak", "Daybreak Café", "Bar Juniper", "Little Saigon", "The Good Burger"];
const names = ["Alex Morgan", "Jamie Chen", "Sam Rivera", "Taylor Brooks", "Jordan Patel", "Charlie Wilson"];
const menus = ["Autumn dinner", "Weekend brunch", "Seasonal favourites", "Evening drinks", "Lunch specials", "Tasting menu"];
const overrides = new Map<string, Partial<AdminRecord>>();
function record(kind: Kind, index: number): AdminRecord {
  const id = `${kind.slice(0, 3).toUpperCase()}-${String(1000 + index)}`;
  return {
    id, name: kind === "users" ? `${names[index % 6]} ${Math.floor(index / 6) + 1}` : `${menus[index % 6]} ${Math.floor(index / 6) + 1}`,
    email: `studio${index + 1}@example.com`, restaurant: restaurants[index % 6],
    status: statuses[kind][index % statuses[kind].length],
    updatedAt: new Date(Date.UTC(2026, 9, 26) - index * 3_600_000).toISOString(),
    type: index % 2 ? "Drinks menu" : "Food menu", quantity: (index % 5 + 1) * 100, total: 85 + index * 2.5,
    ...overrides.get(id),
  };
}
function abortableDelay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 180);
    signal.addEventListener("abort", abort, { once: true });
  });
}
/** Demo only: returns a single bounded page and count metadata.
 * Replace with server-side filtering/sorting/pagination; never fetch all records.
 * The server should index filters/sorts (with an ID tie-breaker), enforce limit <= 100,
 * and cache counts per search rather than recounting on every page navigation.
 */
export const adminRepository: AdminRepository = {
  async search(kind, request, signal) {
    await abortableDelay(signal);
    const matches = (row: AdminRecord) => (!request.status || row.status === request.status) &&
      `${row.id} ${row.name} ${row.email} ${row.restaurant} ${row.type}`.toLowerCase().includes(request.q.trim().toLowerCase());
    // Small virtual fixture; only indexes are sorted, records are generated on demand.
    const indexes = Array.from({ length: 137 }, (_, i) => i);
    if (request.sort === "name_asc") indexes.sort((a, b) => record(kind, a).name.localeCompare(record(kind, b).name) || a - b);
    const items: AdminRecord[] = [];
    const offset = (request.page - 1) * request.limit;
    let totalItems = 0;
    for (const index of indexes) {
      signal.throwIfAborted();
      const row = record(kind, index);
      if (!matches(row)) continue;
      if (totalItems >= offset && items.length < request.limit) items.push(row);
      totalItems++;
    }
    return { items, totalItems };
  },
  async getOrder(id, signal) {
    await abortableDelay(signal);
    if (!/^ORD-\d{4}$/.test(id)) return null;
    const index = Number(id.slice(4)) - 1000;
    if (index < 0 || index >= 137) return null;
    const order = record("orders", index);
    const shipping = 8;
    const subtotal = Math.round((order.total - shipping) / 1.13 * 100) / 100;
    const tax = Math.round((order.total - shipping - subtotal) * 100) / 100;
    const address = [order.restaurant, names[index % 6], "124 Ossington Avenue", "Toronto, ON M6J 2Z5", "Canada"];
    const shipped = ["Shipped", "Delivered"].includes(order.status);
    return {
      ...order, customerName: names[index % 6], phone: "+1 416 555 0100",
      placedAt: order.updatedAt, shippingAddress: address, billingAddress: [...address],
      items: [{ designId: `DES-${1000 + index}`, name: order.name, quantity: order.quantity,
        size: "A4 portrait · 210 × 297 mm", sides: "Double-sided", paper: "350 gsm premium cardstock", finish: "Matte", amount: subtotal }],
      subtotal, shipping, tax,
      payment: { status: "Paid", method: "Visa ending in 4242", reference: `PAY-${1000 + index}` },
      delivery: { method: "Standard delivery", estimate: "October 28–30, 2026", carrier: shipped ? "Demo courier" : null, tracking: shipped ? `SIZ${100000 + index}` : null },
      notes: "Please deliver to the restaurant reception during opening hours.",
    };
  },
  async updateUser(id, details) { overrides.set(id, { ...overrides.get(id), ...details }); },
  async updateOrderStatus(id, status) { overrides.set(id, { ...overrides.get(id), status }); },
};
