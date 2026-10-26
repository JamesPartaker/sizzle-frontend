# Export verification

Validated on October 26, 2026:

- `pnpm build`: passes strict Vue/TypeScript checking and the Vite production build.
- `pnpm test`: 11 tests pass across three test files.
- `pnpm install --lockfile-only --offline --frozen-lockfile`: lockfile matches manifests.
- `pnpm exec playwright test --list`: discovers all eight desktop/mobile test cases.
- Browser checks: desktop rendering against the approved design, menu positioning outside cards, rename, duplicate, delete, undo, combined template filtering, template creation, large preview with no heading fields, uploaded image persistence after reload, and mobile order details without horizontal overflow.
- Production build served with `vite preview` and visually checked. See `restaurant-preview.jpg`.

The Playwright runner suite is provided but was not executed as an automated run in this environment; browser flows above were exercised through the connected browser. Run `pnpm test:e2e` after installing Chromium for a repeatable automated pass.

The typed HTTP clients were tested with mock responses, not against a running Go API. Production auth, payments, order fulfillment, and full editor integration remain outside this export.
