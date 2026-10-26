import { createDemoClient, createHttpClient } from "@sizzle/api-client";
export const isDemo = import.meta.env.VITE_DATA_SOURCE !== "api";
export const api = isDemo
  ? createDemoClient(window.localStorage)
  : createHttpClient(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    );
