# Sizzle restaurant workspace

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
│   └── admin/               # Intentionally empty; no app or package configured
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

The ZIP preserves the empty `apps/admin/` directory. Git does not track empty directories; recreate it with `mkdir -p apps/admin` after cloning if necessary. Nothing is generated inside admin.

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

The exported app remains a UI prototype: it does not authenticate users, take payments, or place orders. Production access must be enforced by the server. The session shown by Pinia is demo presentation state, not an authorization mechanism.

Set `VITE_EDITOR_URL` to the separately deployed editor when ready. “Open in editor” then navigates there with `?documentId=<id>`. Without it, the approved read-only preview modal is shown. There are no menu-heading customization fields in that modal.

Google Fonts are loaded as in the original design (DM Sans and DM Serif Display). Self-host them later if your deployment requires offline fonts or a restrictive content security policy.
