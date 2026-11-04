import { expect, it, vi } from "vitest";
import { createPrivateAssetService } from "../apps/restaurant/src/services/assets";

const asset = {
  id: "019a4500-0000-7000-8000-000000000001", filename: "logo.png",
  content_type: "image/png", size_bytes: 3, state: "ready", created_at: "2026-11-04T00:00:00Z",
};
const signed = { url: "https://storage.example.test/upload", headers: { "Content-Type": "image/png", "Content-Length": "3", Host: "storage.example.test", "x-amz-meta-test": "signed" }, expires_in: 300 };

it("uploads raw bytes with signed headers, then completes using cookie authentication", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ asset: { ...asset, state: "pending" }, upload: signed }))
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(Response.json(asset));
  const file = new File(["png"], "logo.png", { type: "image/png" });
  const service = createPrivateAssetService("https://api.example.test", fetcher);
  await expect(service.upload(file)).resolves.toEqual(asset);
  expect(fetcher.mock.calls[0]).toEqual(["https://api.example.test/api/v1/assets", expect.objectContaining({
    method: "POST", credentials: "include", body: JSON.stringify({ filename: "logo.png", content_type: "image/png", size_bytes: 3 }),
  })]);
  expect(fetcher.mock.calls[1]).toEqual([signed.url, {
    method: "PUT", body: file, credentials: "omit", headers: { "Content-Type": "image/png", "x-amz-meta-test": "signed" },
  }]);
  expect(fetcher.mock.calls[2]).toEqual([`https://api.example.test/api/v1/assets/${asset.id}/complete`, expect.objectContaining({ method: "POST", credentials: "include" })]);
});

it("lists only ready files, resolves private image URLs, and keeps fonts as metadata", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ assets: [asset, { ...asset, id: "pending", state: "pending" }, { ...asset, id: "font", filename: "brand.ttf", content_type: "font/ttf" }] }))
    .mockResolvedValueOnce(Response.json({ url: "https://storage.example.test/preview", headers: null, expires_in: 300 }));
  const files = await createPrivateAssetService("https://api.example.test", fetcher).list();
  expect(files).toEqual([
    { id: asset.id, name: "logo.png", type: "Images", size: "PNG · 1 KB", data: "https://storage.example.test/preview" },
    { id: "font", name: "brand.ttf", type: "Fonts", size: "TTF · 1 KB", data: undefined },
  ]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toBe(`https://api.example.test/api/v1/assets/${asset.id}/download`);
});

it.each(["put", "complete"])("releases the reservation after a failed %s", async (failure) => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ asset, upload: signed }))
    .mockResolvedValueOnce(new Response(null, { status: failure === "put" ? 500 : 200 }));
  if (failure === "complete") fetcher.mockResolvedValueOnce(new Response(null, { status: 400 }));
  fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await expect(createPrivateAssetService("https://api.example.test", fetcher).upload(new File(["png"], "logo.png"))).rejects.toThrow();
  expect(fetcher.mock.lastCall).toEqual([`https://api.example.test/api/v1/assets/${asset.id}`, expect.objectContaining({ method: "DELETE", credentials: "include" })]);
  if (failure === "put") expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/complete"))).toBe(false);
});

it.each([401, 409])("surfaces upload failure %i without uploading bytes or falling back to demo", async (status) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
  await expect(createPrivateAssetService("https://api.example.test", fetcher).upload(new File(["png"], "logo.png"))).rejects.toThrow(status === 409 ? "storage is full" : "sign in");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("returns an empty list for a new workspace and surfaces listing authorization errors", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ assets: null }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }));
  const service = createPrivateAssetService("https://api.example.test", fetcher);
  await expect(service.list()).resolves.toEqual([]);
  await expect(service.list()).rejects.toMatchObject({ status: 401 });
});

it("normalizes a font's missing MIME type to the Go contract", async () => {
  const font = { ...asset, filename: "brand.ttf", content_type: "font/ttf" };
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ asset: font, upload: { ...signed, headers: { "Content-Type": "font/ttf" } } }))
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(Response.json(font));
  await createPrivateAssetService("https://api.example.test", fetcher).upload(new File(["ttf"], "brand.ttf"));
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ filename: "brand.ttf", content_type: "font/ttf", size_bytes: 3 });
});
