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
it("loads individual template/design metadata with a consistent source template", async () => {
  const signal = new AbortController().signal;
  const template = await adminRepository.getTemplate("TEM-1000", signal);
  const design = await adminRepository.getDesign("DES-1000", signal);
  expect(template?.id).toBe("TEM-1000");
  expect(template?.pages).toBe(2);
  expect(template?.fonts).toContain("DM Sans");
  expect(design?.template).toEqual({ id: template?.id, name: template?.name });
  expect(design?.owner.email).toBe("studio1@example.com");
  expect(design?.documentId).toBe("DES-1000");
  await expect(adminRepository.getTemplate("TEM-9999", signal)).resolves.toBeNull();
  await expect(adminRepository.getDesign("bad-id", signal)).resolves.toBeNull();
  const controller = new AbortController();
  controller.abort();
  await expect(adminRepository.getDesign("DES-1000", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
});
import { designEditorUrl } from "../apps/admin/src/editor";
it("builds a safe editor handoff with the selected document ID", () => {
  const result = designEditorUrl("https://editor.example.com/studio?workspace=admin&documentId=old", "design / 123", "https://admin.example.com");
  const url = new URL(result!);
  expect(url.searchParams.get("documentId")).toBe("design / 123");
  expect(url.searchParams.get("workspace")).toBe("admin");
  expect(designEditorUrl("/editor", "DES-1000", "https://admin.example.com")).toBe("https://admin.example.com/editor?documentId=DES-1000");
  expect(designEditorUrl(undefined, "id", "https://admin.example.com")).toBeNull();
  expect(designEditorUrl("javascript:alert(1)", "id", "https://admin.example.com")).toBeNull();
});

it("loads just the selected user and reflects detail updates", async () => {
  const signal = new AbortController().signal;
  const user = await adminRepository.getUser("USE-1002", signal);
  expect(user?.id).toBe("USE-1002");
  await adminRepository.updateUser("USE-1002", { name: "User revised", email: "revised@example.com", restaurant: "Revised restaurant", status: "Active" });
  const revised = await adminRepository.getUser("USE-1002", signal);
  expect(revised).toMatchObject({ name: "User revised", email: "revised@example.com", restaurant: "Revised restaurant", status: "Active" });
  await expect(adminRepository.getUser("USE-9999", signal)).resolves.toBeNull();
  await expect(adminRepository.getUser("invalid", signal)).resolves.toBeNull();
});
