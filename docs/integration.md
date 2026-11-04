# Integration contracts

## Current Go API

`createGoApiClient(origin)` in `packages/api-client/src/go-api.ts` is based on the local `sizzle-go-api` controllers inspected during export. It uses cookie credentials and runtime Zod validation.

```ts
import { createGoApiClient } from "@sizzle/api-client";
const go = createGoApiClient("http://localhost:8080");
const profile = await go.me();
const designs = await go.designs.list();
const created = await go.designs.create({ Name: "Dinner", Description: "" });
await go.designs.update(created.designId, {
  Name: "Autumn dinner",
  Description: "",
});
```

Supported current endpoints:

| Operation               | Go endpoint                         |
| ----------------------- | ----------------------------------- |
| Current user            | `GET /api/v1/me`                    |
| List/create designs     | `GET/POST /api/v1/designs`          |
| Read design             | `GET /api/v1/design/:id` (singular) |
| Update design metadata  | `PUT /api/v1/designs/:id`           |
| Soft-delete design      | `DELETE /api/v1/designs/:id`        |
| Save editor document    | `POST /api/v1/designs/:id/document` |
| List/start asset upload | `GET/POST /api/v1/assets`           |
| Complete upload         | `POST /api/v1/assets/:id/complete`  |
| Signed download URL     | `GET /api/v1/assets/:id/download`   |
| Delete asset            | `DELETE /api/v1/assets/:id`         |
| Storage usage           | `GET /api/v1/assets/storage`        |

The restaurant asset page is connected to these Go endpoints through `createPrivateAssetService`. To enable it, add these settings to `apps/restaurant/.env.local` and restart Vite:

```dotenv
VITE_DATA_SOURCE=demo
VITE_ASSET_SOURCE=api
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_SOURCE=api
```

This connects assets and login to Go while retaining the other workspace prototypes. `VITE_ASSET_API_BASE_URL` optionally overrides the Go origin for assets. If `VITE_ASSET_SOURCE` is blank, it follows `VITE_DATA_SOURCE`; setting it explicitly to `demo` uses browser-local assets.

Uploads reserve metadata with `POST /api/v1/assets`, PUT the raw File to the signed storage URL, then call `/complete`. The browser sets Host and Content-Length; other returned signed headers are preserved. API requests include session cookies; storage uploads omit credentials. Failed PUT/completion attempts make a best-effort DELETE to release the pending storage reservation. Quota, authentication, and verification failures appear in the upload notification.

The page accepts PNG, JPEG, GIF, TTF, and OTF files, up to 20 MiB each. MIME types are derived from the supported file extension, including fonts whose browser MIME type is empty or varies; the Go server verifies actual content. SVG and WebP are rejected. Listing shows ready assets only and maps server metadata to image/font cards. Pending uploads are excluded. Image previews request signed download URLs, refresh every four minutes while the page is active, and refetch on focus/remount. Signed URLs stay in memory and are never stored in localStorage. Font cards display metadata without requesting image previews.

The Go server and private bucket must be configured as described in `sizzle-go-api/docs/private-assets.md`. The API needs credentialed CORS for the frontend origin and the bucket needs CORS for signed PUT requests. Run `VITE_ASSET_SOURCE=api pnpm test:e2e tests/e2e/assets-api.spec.ts` for mocked desktop/mobile upload, preview, reload, and quota checks.

The current Go server does not expose the template listing, print orders, duplicate, or undo/restore endpoints used by this prototype. Its design DTOs also do not directly contain the template preview metadata shown here. Those need an explicit mapping and backend implementation. Assets use the Go integration above; the other workspace resources still require those adapters.

## UI data service

The frontend consumes `SizzleClient`, a typed interface with designs/templates/assets/orders. `createDemoClient` implements it with browser storage. Existing prototype localStorage keys are retained for migration: `sizzle-docs` and `sizzle-assets`. In demo mode, uploaded image data remains in the current browser only. Live assets use the Go service independently.

`createHttpClient` is an optional frontend-facing REST contract, not the existing Go adapter. `VITE_DATA_SOURCE=api` selects this contract for designs, templates, and orders; assets use the Go service. Its base URL must point at a service/adapter that implements the following shape:

| Method | Relative URL             | Body / result                           |
| ------ | ------------------------ | --------------------------------------- |
| GET    | `/designs`               | `Design[]`                              |
| POST   | `/designs`               | `NewDesign` → `Design`                  |
| PATCH  | `/designs/:id`           | `{ name }` → `Design`                   |
| POST   | `/designs/:id/duplicate` | → `Design`                              |
| DELETE | `/designs/:id`           | → 204                                   |
| POST   | `/designs/:id/restore`   | deleted `Design` → `Design`             |
| GET    | `/templates`             | `Template[]`                            |
| GET    | `/orders`                | `PrintOrder[]`                          |

The Zod definitions in `packages/schemas` are the source of truth for these frontend models. The standalone `createHttpClient` retains its legacy `/assets` contract for external adapters, but the restaurant app routes asset operations through its separate asset service. Use server-owned prices, order state, and delivery details; demo calculations are presentation examples.

## Authentication and routing

The restaurant app provides `/login` and `/register` outside the workspace layout. By default these pages explain demo mode and provide an explicit link to explore the demo workspace; submitting credentials does not create a fake session or store a password.

Set `VITE_AUTH_SOURCE=api` to enable the Go server's cookie-based authentication. Set `VITE_AUTH_API_BASE_URL` to the Go server origin (falls back to `VITE_API_BASE_URL`, then the frontend origin). `createGoApiClient().auth.login` and `.auth.register` POST `{ emailAddress, password }` to `/login` and `/register`, accepting the server's empty 204 and 201 responses. Successful submission opens `/dashboard`; failures stay on the form. Google sign-in navigates to the Go server's `/login/google`. The Go OAuth callback currently redirects to `/` on the API origin; production routing must serve the frontend there or proxy these auth routes on the frontend origin. Separate origins also require the server's credentialed CORS and cookie configuration to allow the frontend.

The auth setting is independent of `VITE_DATA_SOURCE`; enabling authentication does not replace the workspace data adapter. Full name and persistent “remember me” are omitted because the current Go endpoint does not support them. Password reset presents an availability notice because the backend has no reset endpoint. Terms and privacy dialogs are provisional launch copy.

Workspace routes remain accessible for the existing demo; this change does not introduce authorization guards or claim that the Pinia demo profile is the authenticated user. Before production, connect the workspace profile to `/api/v1/me`, enforce session checks and server ownership checks, and replace demo data with the intended API adapter. No admin routes or permissions are changed.

Run `pnpm test:e2e tests/e2e/auth.spec.ts` for demo-page checks and `VITE_AUTH_SOURCE=api pnpm test:e2e tests/e2e/auth-api.spec.ts` for mocked Go sign-in and registration checks. API-mode tests start an isolated server on port 4179 so they do not reuse a running demo server.

## Shared packages

Packages export TypeScript and Vue source; Vite compiles them directly in this workspace. They are private workspace packages, not prebuilt npm distributions. The empty admin app can later consume the same packages without duplicating the restaurant interface.
