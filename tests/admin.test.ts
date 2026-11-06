import { afterEach, expect, it, vi } from "vitest";
import { adminRepository } from "../apps/admin/src/data";
const input = { q: "Sunday & Oak", status: "Active", limit: 25 as const, page: 2, sort: "name_asc" as const };
afterEach(() => vi.unstubAllGlobals());
it("sends bounded server-side search with cookies and cancellation", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [], totalItems: 51 }));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  expect(await adminRepository.search("users", input, signal)).toEqual({ items: [], totalItems: 51 });
  const [url, init] = fetcher.mock.calls[0];
  expect(new URL(url).pathname).toBe("/api/v1/admin/users");
  expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ q: input.q, status: "Active", limit: "25", page: "2", sort: "name_asc" });
  expect(init).toMatchObject({ credentials: "include", cache: "no-store", signal });
});
it("reads every detail kind and maps only 404 to missing", async () => {
  const fetcher = vi.fn().mockImplementation(async (url) => Response.json({ id: new URL(url).pathname.split("/").pop() }));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  for (const [kind, get] of [["users", adminRepository.getUser], ["templates", adminRepository.getTemplate], ["designs", adminRepository.getDesign], ["orders", adminRepository.getOrder]] as const) {
    expect(await get("selected", signal)).toEqual({ id: "selected" });
    expect(fetcher.mock.lastCall[0]).toContain(`/api/v1/admin/${kind}/selected`);
  }
  fetcher.mockResolvedValue(new Response(null, { status: 404 }));
  expect(await adminRepository.getOrder("missing", signal)).toBeNull();
  fetcher.mockResolvedValue(new Response(null, { status: 403 }));
  await expect(adminRepository.getOrder("private", signal)).rejects.toMatchObject({ status: 403 });
});
it("persists selected user edits and order status using the Go routes", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetcher);
  const details = { name: "Jane", email: "jane@example.com", restaurant: "Oak", status: "Active" };
  await adminRepository.updateUser("user", details);
  await adminRepository.updateOrderStatus("order", "Shipped");
  expect(fetcher.mock.calls[0][0]).toContain("/api/v1/admin/users/user");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "PUT", credentials: "include", body: JSON.stringify(details) });
  expect(fetcher.mock.calls[1][0]).toContain("/api/v1/admin/orders/order/status");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ status: "Shipped" });
});
it("surfaces session failures without returning fixture rows", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  await expect(adminRepository.search("users", input, new AbortController().signal)).rejects.toMatchObject({ status: 401 });
});
import { paginationPages } from "../apps/admin/src/pagination";
it("shows the first/last pages and neighbours with ellipses", () => {
  expect(paginationPages(10, 100)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 100]);
  expect(paginationPages(1, 1)).toEqual([1]);
  expect(paginationPages(1, 6)).toEqual([1, 2, 3, "ellipsis", 6]);
  expect(paginationPages(100, 100)).toEqual([1, "ellipsis", 98, 99, 100]);
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
