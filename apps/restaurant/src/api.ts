import { createDemoClient, createGoWorkspaceClient } from "@sizzle/api-client";
import { assetContentType, assetData } from "@sizzle/utils";
import { createPrivateAssetService, type AssetService } from "./services/assets";
export const isDemo = import.meta.env.VITE_DATA_SOURCE !== "api";
const demoApi = createDemoClient(window.localStorage);
export const api = isDemo
  ? demoApi
  : createGoWorkspaceClient(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    );

// Assets can use Go independently while the other workspace APIs are prototypes.
export const isLiveAssets = (import.meta.env.VITE_ASSET_SOURCE || import.meta.env.VITE_DATA_SOURCE) === "api";
export const assetApi: AssetService = isLiveAssets
  ? createPrivateAssetService(import.meta.env.VITE_ASSET_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin)
  : {
      list: () => demoApi.assets.list(),
      upload: async (file) => demoApi.assets.upload({
        name: file.name,
        type: assetContentType(file)?.startsWith("font/") ? "Fonts" : "Images",
        size: `${file.name.split(".").pop()?.toUpperCase()} · ${Math.ceil(file.size / 1024)} KB`,
        data: assetContentType(file)?.startsWith("image/") ? await assetData(file) : undefined,
      }),
    };
