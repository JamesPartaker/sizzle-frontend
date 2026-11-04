import { createGoApiClient } from "@sizzle/api-client";

// Explicitly opt into server auth independently of the workspace data adapter.
export const isLiveAuth = import.meta.env.VITE_AUTH_SOURCE === "api";
export const authApi = createGoApiClient(
  import.meta.env.VITE_AUTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin,
);
