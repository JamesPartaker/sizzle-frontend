# Sizzle workspaces

A Vue 3 / TypeScript export of the approved Sizzle Menus restaurant UI. This is a standalone pnpm monorepo; it does not modify the hosted Sites prototype, the Go API, or the separate editor.

## Start

Use Node 22.12+ (Node 24 recommended) and pnpm 10.12.1. The included `.tool-versions` is optional for asdf users.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:4173. Demo mode works immediately, with browser-local persistence for designs and uploaded images. Demo records, print totals, profile details, and delivery addresses are illustrative.

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

Run `pnpm dev:admin` and open http://127.0.0.1:4174. Routes: `/templates`, `/designs`, `/users`, `/orders`, `/orders/:id`. Order details include items and print specifications, customer contact, shipping and billing addresses, payment, delivery/tracking, notes, totals, and an inline status form. The detail repository method requests only the selected order; all details are illustrative demo data. The app reuses the restaurant typography, colours, navigation, headings, footer and accessible dialogs, with compact table rows. `pnpm build` and `pnpm typecheck` include both apps; `pnpm preview:admin` previews the admin build.

User search results link to `/users/:id`, which loads one user through `getUser`. The details page shows profile and account metadata and an inline form for updating name, email, restaurant, and account status. Updates refresh that user’s details and the user search cache. Loading, retry, reset, and missing-user states are included; no API calls are implemented.

Template and design search results link to `/templates/:id` and `/designs/:id`. These pages load one record through `getTemplate` / `getDesign`, with cancellation and loading, retry, and not-found states. Template details include classification, tags, dimensions, pages, bleed, fonts, publication metadata, and usage. Design details include owner information, document metadata, activity, and a link to the source template.

To connect the design details editor button, copy `apps/admin/.env.example` to `.env.local` in that directory and set `VITE_EDITOR_URL` to the editor deployment, then restart Vite. The button opens a new tab with `?documentId=<selected document ID>`, preserving other URL parameters. Without configuration it shows an unavailable state. Demo IDs are illustrative; loading the actual document requires the editor’s document integration.

The administrator uses an in-memory demo repository and makes no API calls. User detail and order status edits last until reload. It does not implement authentication or authorization; production access must be enforced by the server.

`apps/admin/src/data.ts` defines the replaceable `AdminRepository` boundary. Each search passes the query, status, sort, bounded limit (25/50/100), page number and AbortSignal. Implement filtering, stable sorting (with an ID tie-breaker), and pagination on the server; return only `{ items, totalItems }`. Never fetch the complete dataset to paginate in the browser. The server should index filters/sorts and cache count metadata per search so numbered navigation does not repeat an expensive count for each page.

Search is debounced 300ms; filter/sort/size changes reset the page. TanStack Query cancels obsolete requests, keys caches by all search parameters, and expires inactive pages after 60 seconds. Centered pagination shows the first/last pages, two neighbours on either side of the current page, and ellipses for omitted pages. Number buttons request the selected page directly. User/order mutations invalidate only the relevant search namespace. Connect real mutation methods at the same repository boundary.

Run `pnpm test:e2e:admin` for desktop/mobile search, pagination, and edit flows (`pnpm exec playwright install chromium` once first).

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
