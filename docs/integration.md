# Go API integration

The restaurant and admin workspaces use `sizzle-go-api` by default. API failures are shown to the user; they never fall back to fixtures. The restaurant's optional demo mode requires `VITE_DATA_SOURCE=demo` and `VITE_AUTH_SOURCE=demo`.

## Local configuration

Run Go on port 1323, the restaurant on 4173, admin on 4174, and the editor on 1234. Use the same hostname throughout (for example `localhost`) so the browser shares the API session consistently. Configure the Go server's credentialed CORS allowlist for every frontend/editor origin. Private storage also needs signed-PUT CORS; see the API's `docs/private-assets.md`.

Copy each app's `.env.example` to `.env.local` to override deployment settings:

```dotenv
VITE_API_BASE_URL=http://localhost:1323
VITE_EDITOR_URL=http://localhost:1234
```

Development defaults to those addresses. Production defaults to the current origin for API calls and `/editor/` for editor navigation; configure explicit origins when deploying separately. Set `SIZZLE_API_ORIGIN` in the editor build when its API lives elsewhere. The editor also defaults local development hostnames to API port 1323.

Restaurant data, assets and auth can be selected independently with `VITE_DATA_SOURCE`, `VITE_ASSET_SOURCE`, and `VITE_AUTH_SOURCE`. Optional asset/auth origin overrides remain supported. All API calls include session cookies; direct signed storage uploads omit credentials.

## Authentication and profile

Password login and registration POST `{emailAddress,password}` to `/login` and `/register`. Protected restaurant navigation loads `/api/v1/me`, redirects expired sessions to `/login`, and populates the restaurant and owner profile from the response. The Go endpoint reads the current active database user and workspace, returning `UserId`, `EmailAddress`, `WorkspaceId`, `Role`, `Name`, `Restaurant`, and `Status`. It never uses cached profile fields from the session as the response.

Sign out POSTs `/logout`, which returns 204, and clears the frontend query cache and profile. Google sign-in is intentionally unconfigured; the button shows an availability message. Password recovery and AI prompt/chat are not connected.

## Restaurant workspace

`createGoWorkspaceClient` maps the Go DTOs to the UI models. It uses:

- Design list/create: `GET/POST /api/v1/designs`.
- Read: `GET /api/v1/design/:id` (singular).
- Metadata: `PUT /api/v1/designs/:id`.
- Soft delete, duplicate and restore: `DELETE /api/v1/designs/:id`, `POST /api/v1/designs/:id/duplicate`, `POST /api/v1/designs/:id/restore`.
- Catalogue: `GET /api/v1/templates`; cards use revision thumbnail endpoints.
- Customer history: `GET /api/v1/orders`.
- Customer detail: `GET /api/v1/orders/:id`; direct links fetch the selected order independently of the history query.

Order status supports Pending, In production, Shipped, Delivered and Cancelled. Totals, tax, shipping, item specifications, addresses, payment status and tracking come from the stored order snapshot. Missing financial breakdowns remain absent rather than being calculated in the browser. Order creation, checkout and payment collection are outside this integration.

Assets use their dedicated private upload service: reserve via `POST /api/v1/assets`, PUT the file to the signed URL, then POST `/api/v1/assets/:id/complete`. Lists, signed previews, deletion and workspace storage usage use the existing Go endpoints. Failed uploads attempt reservation cleanup. Previews are refreshed and signed URLs are never persisted locally.

## Administration

`apps/admin/src/data.ts` implements `AdminRepository` using `/api/v1/admin`. It contains no demo records. Searches for users, templates, designs and orders send `q`, `status`, `page`, `limit`, and `sort`, forwarding cancellation signals and consuming `{items,totalItems}`. Detail pages request `/:kind/:id`; 404 becomes the missing-record state, while permission and server failures remain errors.

User edits PUT `/api/v1/admin/users/:id`. Order status changes PUT `/api/v1/admin/orders/:id/status`. Both refresh the affected search and detail queries after persistence. The server checks current database admin permissions on every request. Sign in through the restaurant app using an admin account; both applications call the same cookie-session API origin.

## Editor

Design navigation opens `?documentId=<UUID>`; admin template navigation uses `?templateId=<UUID>`. API-mode load, revision-aware autosave, save-as-copy, immutable resource resolution, workspace assets and template library publication already use Go. Saves send `{Document,DocumentVersion:1,revision}` and receive `{revision,document}`. Revision conflicts pause autosave and support reload or saving a copy. Local editing without an ID remains available.

PDF rendering is unchanged. AI editing and prepared asset variations remain local demo functionality.

## Checks

- `pnpm test`, `pnpm typecheck`, `pnpm build`.
- `VITE_DATA_SOURCE=api VITE_AUTH_SOURCE=api pnpm exec playwright test tests/e2e/workspace-api.spec.ts tests/e2e/auth-api.spec.ts`.
- `VITE_ASSET_SOURCE=api pnpm exec playwright test tests/e2e/assets-api.spec.ts`.
- `pnpm test:e2e:admin`.

Browser integration tests intercept HTTP responses; Go integration tests separately exercise authorization and persistence against a disposable PostgreSQL database. Normal demo browser tests explicitly set demo mode through the Playwright configuration.
