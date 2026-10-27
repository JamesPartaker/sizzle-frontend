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
export interface SearchRequest {
  q: string; status: string; limit: 25 | 50 | 100;
  cursor: string | null;
  sort: "updated_desc" | "name_asc";
}
export interface SearchPage { items: AdminRecord[]; nextCursor: string | null }
export interface AdminRepository {
  search(kind: Kind, request: SearchRequest, signal: AbortSignal): Promise<SearchPage>;
  updateUser(id: string, details: Pick<AdminRecord, "name" | "email" | "restaurant" | "status">): Promise<void>;
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
/** Demo only: generates at most one page (+ one lookahead), never a full record array.
 * Replace this repository with a server adapter; do not fetch-all then filter here.
 * Server contract: opaque keyset cursor, indexed filters, deterministic sort + ID
 * tie-breaker, enforced limit <= 100, and no required COUNT(*) per keystroke.
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
    let position = Number(request.cursor || 0);
    for (; position < indexes.length; position++) {
      signal.throwIfAborted();
      const row = record(kind, indexes[position]);
      if (!matches(row)) continue;
      if (items.length === request.limit) return { items, nextCursor: String(position) };
      items.push(row);
    }
    return { items, nextCursor: null };
  },
  async updateUser(id, details) { overrides.set(id, { ...overrides.get(id), ...details }); },
  async updateOrderStatus(id, status) { overrides.set(id, { ...overrides.get(id), status }); },
};
