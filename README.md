# Sizzle workspaces

A Vue 3 / TypeScript export of the approved Sizzle Menus restaurant UI. This is a standalone pnpm monorepo; it does not modify the hosted Sites prototype, the Go API, or the separate editor.

## Start

Use Node 22.12+ (Node 24 recommended) and pnpm 10.12.1. The included `.tool-versions` is optional for asdf users.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:4173. The workspace uses the Go API on port 1323 by default. Sign in with email and password. See [integration setup](docs/integration.md) for origins, cookies, storage, and editor configuration. To run the browser-local demo explicitly, set `VITE_DATA_SOURCE=demo` and `VITE_AUTH_SOURCE=demo`.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

For the Playwright browser suite:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

## Structure

```text
sizzle/
├── apps/
│   ├── restaurant/
│   │   ├── src/
│   │   │   ├── components/   # Cards, dialogs, page headings, query states
│   │   │   ├── composables/  # Query/mutation and design action orchestration
│   │   │   ├── stores/       # Pinia session and transient UI state
│   │   │   ├── views/        # Lazy-loaded dashboard, templates, designs, assets, orders
│   │   │   └── assets/       # Original design CSS + Tailwind v4 utilities
│   │   ├── public/assets/   # Original Sizzle SVG artwork
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── admin/               # Administrator UI, port 4174
├── packages/
│   ├── ui/                  # Shared Vue components; Reka dialogs/menus, Lucide icons
│   ├── api-client/          # Demo client, typed Go client, optional UI REST contract
│   ├── schemas/             # Shared Zod schemas and inferred TypeScript models
│   └── utils/               # Relative dates, currency, upload validation, colours
├── tests/                   # Vitest contracts/state tests + Playwright flows
├── docs/integration.md
├── pnpm-workspace.yaml
├── package.json
└── pnpm-lock.yaml
```

## Administrator workspace

Run `pnpm dev:admin` and open http://localhost:4174. Searches, details, user edits, and order status updates use the database-backed `/api/v1/admin` routes. Sign in through the restaurant app with an admin account on the same API origin. Server authorization is checked for every request.

Set `VITE_API_BASE_URL` and `VITE_EDITOR_URL` using `apps/admin/.env.example` when deploying separately. The editor receives `documentId` or `templateId`. See [integration contracts and checks](docs/integration.md).

## Stack and boundaries

- Vue 3 Composition API and Single File Components, strict TypeScript, Vite, pnpm workspaces.
- Tailwind CSS v4 is configured without Preflight, alongside the original stylesheet so the approved design does not drift. The 260px sidebar, `#f7f5f4` background, brighter preview surfaces, bordered template buttons, and larger preview modals are retained.
- Reka UI provides focus trapping, keyboard navigation, Escape handling, outside dismissal, and portalled menus. Components are styled directly to match Sizzle; shadcn-vue is not required for this small custom component set.
- Lucide Vue Next supplies icons. The requested package currently emits an upstream deprecation notice; it is kept to match the requested stack.
- Vue Router uses lazy-loaded history routes. Production hosts must rewrite unknown paths to `index.html`.
- TanStack Vue Query owns fetched records and mutations; Pinia owns client/session presentation state. VueUse supplies storage and drop-zone composables.
- VeeValidate + Zod validates design renames. TanStack Vue Table handles design filtering and sorting while retaining the existing list layout.
- Vitest covers persistence, validation, API parsing, and request contracts. Playwright tests cover the primary user flows at desktop/mobile sizes.

TypeScript is pinned to 5.9.x because the installed Vue type checker is incompatible with TypeScript 7. Vue Router 4 and Vue Table 8 are used for their compatible, stable APIs. All exact resolved versions are in `pnpm-lock.yaml`.

## API and editor integration

Copy `apps/restaurant/.env.example` to `.env.local` to configure local settings. See [integration notes](docs/integration.md) before selecting API mode.

Set `VITE_ASSET_SOURCE=api` and `VITE_API_BASE_URL` to connect asset uploads and listing to `sizzle-go-api`. Enable `VITE_AUTH_SOURCE=api` to sign in with its cookie session. Assets support signed binary uploads, private image previews, and PNG/JPEG/GIF/TTF/OTF files up to 20 MiB. Other workspace data can remain in demo mode with `VITE_DATA_SOURCE=demo`.

The workspace remains a UI prototype; `/login` and `/register` can use the existing Go authentication endpoints when `VITE_AUTH_SOURCE=api` is configured (see [integration settings](docs/integration.md#authentication-and-routing)). The app does not take payments or place orders. Production access must be enforced by the server. The session shown by Pinia is demo presentation state, not an authorization mechanism.

Set `VITE_EDITOR_URL` to the separately deployed editor when ready. “Open in editor” then navigates there with `?documentId=<id>`. Without it, the approved read-only preview modal is shown. There are no menu-heading customization fields in that modal.

Google Fonts are loaded as in the original design (DM Sans and DM Serif Display). Self-host them later if your deployment requires offline fonts or a restrictive content security policy.


## Shared documents and live editor handoff

`packages/document` is the canonical `sizzle.document` v1 schema, validator, deterministic font compiler, resource library and SVG renderer; see its README for the complete contract and LLM editing rules. Run `node scripts/sync-document.mjs` after changing it and commit the generated copies in the editor/API repositories together. Fonts and images are immutable by hash; add filenames instead of replacing library bytes.

With `VITE_DATA_SOURCE=api`, the restaurant workspace now uses the Go `/api/v1/designs` and `/api/v1/templates` contracts. Template selection creates an independent design snapshot on the server. Lists display revision-specific authenticated thumbnails. `VITE_EDITOR_URL` passes `documentId` from designs and `templateId` from admin templates. Configure credentialed API CORS and sign in before opening another origin. API PDF/thumbnail rendering requires the Node/Chromium worker documented in `sizzle-go-api/renderer/README.md`.

Browser demo mode remains available when `VITE_DATA_SOURCE` is not `api`. Its illustrative template previews are separate from real revision thumbnails. Existing order-service integration is unchanged.
