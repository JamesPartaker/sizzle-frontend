import { expect, it } from "vitest";
import { adminRepository } from "../apps/admin/src/data";
const request = { q: "", status: "", limit: 25 as const, page: 1, sort: "updated_desc" as const };
it("bounds pages and traverses every page without duplicate records", async () => {
  const seen = new Set<string>();
  let number = 1;
  let total = 1;
  do {
    const page = await adminRepository.search("templates", { ...request, page: number }, new AbortController().signal);
    expect(page.items.length).toBeLessThanOrEqual(25);
    for (const item of page.items) { expect(seen.has(item.id)).toBe(false); seen.add(item.id); }
    total = Math.ceil(page.totalItems / request.limit);
    number++;
  } while (number <= total);
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

import { paginationPages } from "../apps/admin/src/pagination";
it("shows the first/last pages and neighbours with ellipses", () => {
  expect(paginationPages(10, 100)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 100]);
  expect(paginationPages(1, 1)).toEqual([1]);
  expect(paginationPages(1, 6)).toEqual([1, 2, 3, "ellipsis", 6]);
  expect(paginationPages(100, 100)).toEqual([1, "ellipsis", 98, 99, 100]);
});
it("jumps directly to the last bounded page", async () => {
  const last = await adminRepository.search("templates", { ...request, page: 6 }, new AbortController().signal);
  expect(last.totalItems).toBe(137);
  expect(last.items).toHaveLength(12);
  expect(last.items[0].id).toBe("TEM-1125");
});
it("loads a single complete order and handles unknown order IDs", async () => {
  const signal = new AbortController().signal;
  const order = await adminRepository.getOrder("ORD-1000", signal);
  expect(order?.id).toBe("ORD-1000");
  expect(order?.items[0].quantity).toBe(order?.quantity);
  expect(order!.subtotal + order!.shipping + order!.tax).toBeCloseTo(order!.total, 2);
  expect(order?.shippingAddress.length).toBeGreaterThan(0);
  await expect(adminRepository.getOrder("ORD-9999", signal)).resolves.toBeNull();
  await expect(adminRepository.getOrder("invalid", signal)).resolves.toBeNull();
});
