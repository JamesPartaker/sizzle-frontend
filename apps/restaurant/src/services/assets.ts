import { createGoApiClient, GoApiError, type GoAsset } from "@sizzle/api-client";
import type { BrandAsset } from "@sizzle/schemas";
import { assetContentType, validateUpload } from "@sizzle/utils";

export interface AssetService {
  list(): Promise<BrandAsset[]>;
  upload(file: File): Promise<BrandAsset | GoAsset>;
}

export function createPrivateAssetService(
  origin: string,
  fetcher: typeof fetch = fetch,
): AssetService {
  const go = createGoApiClient(origin, fetcher);
  return {
    async list() {
      const assets = await go.assets.list();
      return Promise.all(assets.filter((asset) => asset.state === "ready").map(async (asset) => ({
        id: asset.id,
        name: asset.filename,
        type: asset.content_type.startsWith("image/") ? "Images" : "Fonts",
        size: `${asset.filename.split(".").pop()?.toUpperCase()} · ${Math.ceil(asset.size_bytes / 1024)} KB`,
        data: asset.content_type.startsWith("image/")
          ? (await go.assets.download(asset.id)).url
          : undefined,
      })));
    },
    async upload(file) {
      const error = validateUpload(file);
      if (error) throw new Error(error);
      let id: string | undefined;
      try {
        const { asset, upload } = await go.assets.beginUpload({
          filename: file.name,
          content_type: assetContentType(file)!,
          size_bytes: file.size,
        });
        id = asset.id;
        // The browser sets Host and Content-Length from the URL and Blob.
        const headers = Object.fromEntries(Object.entries(upload.headers).filter(
          ([name]) => !["host", "content-length"].includes(name.toLowerCase()),
        ));
        const response = await fetcher(upload.url, {
          method: "PUT", headers, body: file, credentials: "omit",
        });
        if (!response.ok) throw new Error("Could not upload this file. Please try again.");
        return await go.assets.completeUpload(id);
      } catch (error) {
        // Failed uploads otherwise keep a pending workspace quota reservation.
        if (id) await go.assets.remove(id).catch(() => undefined);
        if (error instanceof GoApiError) {
          if (error.status === 409) throw new Error("Your workspace asset storage is full.");
          if (error.status === 401) throw new Error("Please sign in to upload assets.");
          if (error.status === 400) throw new Error("This file could not be verified. Choose a valid PNG, JPG, GIF, TTF or OTF file.");
        }
        throw error;
      }
    },
  };
}
