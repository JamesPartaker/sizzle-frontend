import { expect, it } from "vitest";
import { adminRepository } from "../apps/admin/src/data";
const request = { q: "", status: "", limit: 25 as const, cursor: null, sort: "updated_desc" as const };
it("bounds pages and traverses every cursor without duplicate records", async () => {
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await adminRepository.search("templates", { ...request, cursor }, new AbortController().signal);
    expect(page.items.length).toBeLessThanOrEqual(25);
    for (const item of page.items) { expect(seen.has(item.id)).toBe(false); seen.add(item.id); }
    cursor = page.nextCursor;
  } while (cursor);
  expect(seen.size).toBe(137);
});
it("combines search/status, returns empty results, and cancels obsolete work", async () => {
  const page = await adminRepository.search("users", { ...request, q: "Sunday", status: "Active" }, new AbortController().signal);
  expect(page.items.length).toBeGreaterThan(0);
  expect(page.items.every(row => row.restaurant === "Sunday Table" && row.status === "Active")).toBe(true);
  expect((await adminRepository.search("users", { ...request, q: "not-a-real-user" }, new AbortController().signal)).items).toEqual([]);
  const controller = new AbortController();
  const pending = adminRepository.search("orders", request, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});
it("updates only the selected user or order in the demo repository", async () => {
  await adminRepository.updateUser("USE-1000", { name: "Test User", email: "test@example.com", restaurant: "Test Restaurant", status: "Suspended" });
  const page = await adminRepository.search("users", { ...request, q: "test@example.com", status: "Suspended" }, new AbortController().signal);
  expect(page.items).toHaveLength(1);
  expect(page.items[0].name).toBe("Test User");
  await adminRepository.updateOrderStatus("ORD-1000", "Shipped");
  const orders = await adminRepository.search("orders", { ...request, q: "ORD-1000" }, new AbortController().signal);
  expect(orders.items[0].status).toBe("Shipped");
});
