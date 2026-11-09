# Sizzle Document 1

The shared, application-owned format for templates and designs. The object sent in `Document` is stored directly in PostgreSQL JSONB. The editor, API worker, PDF generator and thumbnail generator use this package. `document.schema.json` is JSON Schema 2020-12; `src/index.d.ts` is the TypeScript contract. The fixtures in `test/` are complete two-page examples.

## Authority and rendering

- Ordered `pages` contain physical point dimensions (72 pt/in), background, bleed, guides and ordered `rootIds`.
- The `nodes` map contains stable IDs and explicit frames, pivot transforms, opacity, visibility, locking, paint, clipping and child order. Supported nodes: group, text, image, rectangle, ellipse and absolute vector path.
- Editable text runs retain literal Unicode, explicit font declarations, case, size, tracking and paragraph intent. `compileDocument` creates line metrics and glyph contour paths. Ready layouts contain both intent and outlines; the editor paints those paths and the SVG worker uses the identical geometry. No installed fonts, browser text measurement, HTML template layout or fallback CSS determine restored artwork.
- `layoutStatus: "draft"` and `text.layout: null` request compilation. The API regenerates **all** client-supplied text outlines, validates resources and returns the authoritative ready checkpoint. Unsupported glyphs, corrupt resources, unknown versions, stale input hashes and invalid graphs fail explicitly.
- `renderProfile: {"id":"sizzle.fixed","version":"1.0.0"}` pins the renderer/compiler contract. Do not change behavior under an existing profile. Keep immutable font files and old workers available when adding a future profile.

Exactness means identical saved state and layout geometry, including line breaks, glyph contours, crops, transforms, clipping and paint order. Raster antialiasing can differ between browsers/screens. PDF text is outlined vector artwork, so it is portable and visually fixed but not searchable/selectable as text. PDFs retain physical mixed page sizes and TrimBox/BleedBox. Thumbnails use the same SVG at a requested pixel width.

## Resources and custom fonts

Each resource records `{kind,source,mediaType,sha256,byteLength,...}`. `source` contains `{scope:"workspace"|"library",assetId,revisionId,renditionId}`. Images additionally record pixel dimensions. Documents never contain expiring URLs, storage keys, credentials or file bytes. Hashes pin actual immutable bytes; paths and filenames are labels only.

The authenticated editor resolves a design revision with `POST /api/v1/designs/:id/resources/resolve`. The response maps hashes to temporary URLs and headers, including history/preview dependencies. The server checks current workspace membership, downloads protected storage objects directly, verifies hashes/lengths and embeds them in the output. Deleting a referenced asset hides it from new selection while preserving bytes and quota accounting. A save rechecks asset ownership and pins dependencies inside the revision transaction. Admin uploads through `/api/v1/designs/:id/assets` belong to the design's workspace.

Custom TTF/OTF files use the same retained resource mechanism. A font declaration pins a resource, family label, weight, style, variation axes, features and explicit fallback IDs. Synthetic weights/styles and operating-system substitution are not used. Built-in fonts and their licences are under `assets/`. Admin template uploads must be explicitly published to the immutable library before other workspaces can clone them; the template editor does this as part of upload. Customer documents cannot reference private files from another workspace.

## Sessions, persistence and LLM edits

Optional `editorState` contains active page, selection, viewport, panel state, guide/snap preferences, undo/redo, pending preview and namespaced extensions. It never changes committed printable content. Version 1 contains full history snapshots. Version 2 stores lossless object-path deltas chained backwards from the current full scene, with a canonical SHA-256 base hash; arrays and extensions are atomic. The last entry in either stack is the next undo/redo. `expandCheckpoint` and `compactCheckpoint` convert exactly between representations. The API accepts either and stores version 2. The document format remains version 1; the independently versioned session representation does not change its rendering.

Use `expandCheckpoint` **before modifying** a version-2 checkpoint and `compactCheckpoint` after validation/compilation. Do not patch the current scene while leaving a stale history base hash. LLM tools should target node/run IDs, preserve ordering and unknown namespaced extensions, choose existing resolved manifests rather than inventing hashes, and set affected text layouts to null. Use decimal JSON numbers for finite geometry; encode large opaque identifiers as strings. Unknown rendering fields fail validation. `extensions` are preserved and non-rendering; menu source is under `com.sizzle.menu`, editor asset bindings under `com.sizzle.editor`.

```js
import {
  validate,
  expandCheckpoint,
  compactCheckpoint,
  editText,
} from "@sizzle/document";
import { compileDocument } from "@sizzle/document/compiler";
const draft = editText(expandCheckpoint(saved), "title_node", "New title");
const ready = compactCheckpoint(compileDocument(draft, bytesBySHA256));
validate(ready);
```

API saves require `{Document,DocumentVersion:1,revision}`. Revision is a separate optimistic concurrency token: success returns `{revision,document}`; conflict returns 409 and leaves both old and new revisions intact. The editor serializes saves, retains a recovery draft, reconciles returned compiled layouts, and can reload or save a copy on conflict. Local mode keeps checkpoints and exact asset renditions in IndexedDB, with localStorage as a fast checkpoint when capacity allows. Reload uses saved geometry rather than rerunning the menu template. Initial legacy menu authoring and explicit theme/content edits capture a new fixed layout.

Budgets are deliberate: 10 MiB checkpoint, 64 MiB resolved resources, bounded shaping and worker time/concurrency, schema node/page/string limits. A budget failure is an error; content/history is never silently truncated by the serializer. Undo UI retains its established bounded history policy. Unknown versions fail closed, preserving local drafts.

## Sharing this package

This directory in `sizzle-frontend` is canonical. After editing shared code/schema/assets, run `node scripts/sync-document.mjs` from that repository. It copies the package into the editor's `vendor/document` and API's `renderer/document`, generates editor resource URLs and embeds the library manifest/bytes in Go. Commit all copies together. Each is a real pnpm workspace package, so installations and deployments do not depend on adjacent checkouts. The sync script rejects changes/removal of immutable library resource IDs; add a new filename for new bytes.

Checks: `node --test packages/document/test/*.test.mjs`; API renderer `pnpm test`; built adjacent editor `pnpm test:editor` from `sizzle-go-api/renderer`. Browser tests cover local and remote codecs, geometry, typography, pages, undo/redo, exact session restoration and shared vector output. API HTTP integration tests use a disposable PostgreSQL database and retained object storage adapter.

## Menu components and mixed-size surfaces

The optional, independently versioned `production: {version: 1, components: {...}}`
adds physical product intent to the version-1 fixed-layout document. It does not
change `sizzle.fixed/1.0.0` rendering: every page still owns its physical point
size, print background, bleed, safe guides and artwork. Existing documents
without production metadata remain valid. Older validators reject the new
fields explicitly; deploy the synchronized shared package to the editor and API
together before saving component documents. No PostgreSQL schema change is needed.

A component is either a paper group (`name`, `stock`) or a cover (`name`, `type`,
`material`, `materialColor`, `decoration`, `decorationColor`). Pages reference
`componentId`; cover surfaces additionally have a unique `surfaceRole` and must
include front and back. A menu has at most one cover and at least one paper
component. Stock belongs to the paper group, while size/background belong to each
page. Different-sized pages can use the same stock. `COVER_TYPES` defines the
initial supported combinations; these are generic editor choices, not a supplier
catalogue, pricing model or manufacturing approval.

Call `ensureProduction` only on expanded content. The editor expands compact
history before migrating the current scene, retained history and previews. Legacy
pages become one uncoated paper group, retaining artwork and dimensions. Legacy
menu section assignments gain stable page IDs. Production settings participate
in the same save, revisions, history deltas and resource retention as artwork.

Material colour is a canvas preview behind the printable page background. Binder
surfaces start with a transparent print background. SVG/PDF output includes only
fixed artwork, never a simulated material texture or automatically generated foil
or emboss separations. A decoration colour may be used when adding cover text;
subsequent finishing changes do not recolour existing artwork. Supplier-specific
dielines, decoration plates and physical sheet/front-back imposition require a
future manufacturing integration. A design page is a surface, not an implied
physical sheet.

`selectExportPages(document, {part: "all" | "cover" | "paper", componentId?,
pageId?})` filters artwork without mutating it and fails if nothing matches. The
PDF endpoints accept `part` and `componentId` query parameters. Page order and
mixed TrimBox/BleedBox dimensions are preserved. Local printing uses named CSS
page sizes; server PDF export is the authoritative production geometry.

The editor's namespaced page recipe `com.sizzle.menu` records the content purpose
and whether that page participates in template reflow. Reflow replaces template
artwork for the active purpose, preserving cover surfaces, other purposes,
independent artwork, stock, page dimensions, guides and backgrounds. Duplicated
pages become independent artwork so later content edits cannot overwrite them.

Paper components optionally record `role: "menu" | "inside-slip"`; an absent role
means menu paper. This is independent of content purpose (dinner/drinks/table),
stock and size. The editor bottom bar derives All/Cover/Menu/Inside slip filters
from the pages actually present. These are view-only: hidden surfaces remain in
the saved document and exports. The selected filter lives in the namespaced
editor session extension, with All as the fallback when a category disappears.
