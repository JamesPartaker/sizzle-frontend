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

For private uploads, call `beginUpload`, upload binary bytes to the returned signed URL with its headers, then call `completeUpload`. Signed URLs are short lived; do not persist them as permanent asset URLs. The current Go server accepts different upload formats than the prototype (including font files, excluding SVG/WebP), so align the UI's accepted formats when connecting it.

The current Go server does not expose the template listing, print orders, duplicate, or undo/restore endpoints used by this prototype. Its design DTOs also do not directly contain the template preview metadata shown here. Those need an explicit mapping and backend implementation. No Go source is changed in this export, and the restaurant UI is deliberately not silently wired to incompatible endpoints.

## UI data service

The frontend consumes `SizzleClient`, a typed interface with designs/templates/assets/orders. `createDemoClient` implements it with browser storage. Existing prototype localStorage keys are retained for migration: `sizzle-docs` and `sizzle-assets`. Uploaded images remain in the current browser only.

`createHttpClient` is an optional frontend-facing REST contract, not the existing Go adapter. `VITE_DATA_SOURCE=api` selects this contract. Its base URL must point at a service/adapter that implements the following shape:

| Method | Relative URL             | Body / result                           |
| ------ | ------------------------ | --------------------------------------- |
| GET    | `/designs`               | `Design[]`                              |
| POST   | `/designs`               | `NewDesign` → `Design`                  |
| PATCH  | `/designs/:id`           | `{ name }` → `Design`                   |
| POST   | `/designs/:id/duplicate` | → `Design`                              |
| DELETE | `/designs/:id`           | → 204                                   |
| POST   | `/designs/:id/restore`   | deleted `Design` → `Design`             |
| GET    | `/templates`             | `Template[]`                            |
| GET    | `/assets`                | `BrandAsset[]`                          |
| POST   | `/assets`                | `NewAsset` with data URL → `BrandAsset` |
| GET    | `/orders`                | `PrintOrder[]`                          |

The Zod definitions in `packages/schemas` are the source of truth for these frontend models. For a production adapter, replace data URL upload requests with the Go signed-upload flow and map its private asset DTOs into the view model. Use server-owned prices, order state, and delivery details; demo calculations are presentation examples.

## Authentication and routing

The export does not add a login page or invented auth flow. HTTP clients send cookies; 401/403 errors are surfaced instead of being replaced by demo data. Add your existing Go session login flow and a Vue Router `beforeEach` session check when connecting production data. Route guards improve UX; server ownership checks remain authoritative. No admin routes or permissions are added.

## Shared packages

Packages export TypeScript and Vue source; Vite compiles them directly in this workspace. They are private workspace packages, not prebuilt npm distributions. The empty admin app can later consume the same packages without duplicating the restaurant interface.
