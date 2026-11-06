import { apiOrigin } from "./api-origin";
import { createGoApiClient } from "@sizzle/api-client";

// Cookie-session authentication defaults to live; demo remains an explicit option.
export const isLiveAuth = (import.meta.env.VITE_AUTH_SOURCE || import.meta.env.VITE_DATA_SOURCE || "api") !== "demo";
export const authApi = createGoApiClient(
  import.meta.env.VITE_AUTH_API_BASE_URL || apiOrigin,
);
