// Physical product metadata never changes fixed-layout print geometry. Material
// previews are deliberately separate from the page's printable background.
export const COVER_TYPES = Object.freeze({
  binder: {
    materials: ["leather", "linen"],
    decorations: ["none", "foil", "emboss"],
    surfaces: ["front", "back", "spine", "inside-front", "inside-back"],
  },
  printed: {
    materials: ["card"],
    decorations: ["print"],
    surfaces: ["front", "back", "inside-front", "inside-back"],
  },
});
const uid = (prefix) =>
  prefix + "_" + globalThis.crypto.randomUUID().replaceAll("-", "");
const clone = (value) => structuredClone(value);
const blank = (id, name, componentId, width, height) => ({
  id,
  name,
  componentId,
  width,
  height,
  background: "#ffffffff",
  rootIds: [],
  bleed: { top: 0, right: 0, bottom: 0, left: 0 },
  guides: { x: [], y: [], safeInset: { top: 0, right: 0, bottom: 0, left: 0 } },
  extensions: {},
});

/** Mutates an expanded content snapshot only; expand compact history first. */
export function ensureProduction(doc) {
  if (doc.editorState?.version === 2)
    throw new Error("Expand checkpoint before migration");
  if (!doc.production) {
    doc.production = {
      version: 1,
      components: {
        paper_main: { kind: "paper", name: "Menu papers", stock: "uncoated" },
      },
    };
    const source = doc.extensions["com.sizzle.menu"]?.state;
    for (const key of ["canvasTransforms", "canvasTexts", "canvasTextStyles"]) {
      for (const [format, overrides] of Object.entries(source?.[key] || {})) {
        for (const id of Object.keys(overrides)) {
          const match = id.match(/@(\d+)$/);
          const page = match && doc.pages[Number(match[1]) - 1];
          if (page) {
            overrides[id.replace(/@\d+$/, "@" + page.id)] = overrides[id];
            delete overrides[id];
          }
        }
      }
    }
    const stableElementId = (id) =>
      id?.replace(/@(\d+)$/, (match, n) =>
        doc.pages[Number(n) - 1] ? "@" + doc.pages[Number(n) - 1].id : match,
      );
    for (const order of Object.values(source?.canvasLayerOrder || {}))
      for (let i = 0; i < order.length; i++)
        order[i] = stableElementId(order[i]);
    for (const node of Object.values(doc.nodes)) {
      const meta = node.extensions["com.sizzle.editor"];
      if (meta?.elementId) meta.elementId = stableElementId(meta.elementId);
      if (meta?.textElementId)
        meta.textElementId = stableElementId(meta.textElementId);
    }
    for (const page of doc.pages) {
      page.componentId = "paper_main";
      if (source)
        for (const id of page.rootIds) {
          const node = doc.nodes[id];
          if (
            node?.type === "rect" &&
            node.name === "Rect" &&
            node.frame.width === page.width &&
            node.frame.height === page.height &&
            node.transform.x === 0 &&
            node.transform.y === 0 &&
            node.transform.rotation === 0
          )
            node.extensions["com.sizzle.template"] = { pageId: page.id };
        }
      if (source)
        page.extensions["com.sizzle.menu"] = {
          format: source.format,
          managed: true,
        };
    }
  }
  const source = doc.extensions["com.sizzle.menu"]?.state;
  if (source)
    for (const [key, format] of [
      ["sections", source.format === "table" ? "table" : "dinner"],
      ["drinks", "drinks"],
    ]) {
      const pages = doc.pages.filter(
        (p) => p.extensions["com.sizzle.menu"]?.format === format,
      );
      for (const section of source[key] || [])
        if (!section.pageId && pages.length)
          section.pageId =
            pages[Math.min(section.page || 0, pages.length - 1)].id;
    }
  return doc;
}
export function pageComponent(doc, page) {
  return doc.production?.components[page.componentId];
}
export function menuPages(doc, format) {
  return doc.pages.filter(
    (p) =>
      pageComponent(doc, p)?.kind === "paper" &&
      p.extensions["com.sizzle.menu"]?.managed &&
      p.extensions["com.sizzle.menu"]?.format === format,
  );
}
export function addPaperPage(doc, options = {}) {
  ensureProduction(doc);
  if (doc.pages.length >= 100)
    throw new Error("Documents support at most 100 surfaces");
  let componentId = options.componentId;
  if (!componentId) {
    componentId = uid("paper");
    doc.production.components[componentId] = {
      kind: "paper",
      name: options.name || "Menu papers",
      stock: "uncoated",
    };
  }
  if (doc.production.components[componentId]?.kind !== "paper")
    throw new Error("Choose a paper component");
  const page = blank(
    uid("page"),
    options.name || "Menu page",
    componentId,
    options.width ?? 612,
    options.height ?? 792,
  );
  if (options.format)
    page.extensions["com.sizzle.menu"] = {
      format: options.format,
      managed: true,
    };
  doc.pages.push(page);
  return page;
}
export function addCover(doc, type = "binder") {
  ensureProduction(doc);
  if (!COVER_TYPES[type]) throw new Error("Unknown cover type");
  if (Object.values(doc.production.components).some((c) => c.kind === "cover"))
    throw new Error("This menu already has a cover");
  if (doc.pages.length > 98)
    throw new Error("The cover needs two available surfaces");
  const componentId = uid("cover");
  doc.production.components[componentId] = {
    kind: "cover",
    name: "Cover",
    type,
    material: COVER_TYPES[type].materials[0],
    materialColor: "#713d42ff",
    decoration: COVER_TYPES[type].decorations[0],
    decorationColor: "#c9a34aff",
  };
  const papers = doc.pages.filter(
    (p) => pageComponent(doc, p)?.kind === "paper",
  );
  const width = Math.max(360, ...papers.map((p) => p.width)) + 18;
  const height = Math.max(504, ...papers.map((p) => p.height)) + 18;
  const pages = ["front", "back"].map((role) => ({
    ...blank(uid("page"), "Cover " + role, componentId, width, height),
    surfaceRole: role,
    background: type === "binder" ? "#ffffff00" : "#ffffffff",
  }));
  doc.pages.unshift(...pages);
  return pages[0];
}
export function addCoverSurface(doc, componentId, surfaceRole) {
  const component = doc.production?.components[componentId];
  if (
    component?.kind !== "cover" ||
    !COVER_TYPES[component.type].surfaces.includes(surfaceRole)
  )
    throw new Error("Unsupported cover surface");
  if (doc.pages.length >= 100)
    throw new Error("Documents support at most 100 surfaces");
  if (
    doc.pages.some(
      (p) => p.componentId === componentId && p.surfaceRole === surfaceRole,
    )
  )
    throw new Error("Cover surface already exists");
  const front = doc.pages.find(
    (p) => p.componentId === componentId && p.surfaceRole === "front",
  );
  const page = {
    ...blank(
      uid("page"),
      "Cover " + surfaceRole.replaceAll("-", " "),
      componentId,
      surfaceRole === "spine" ? 36 : front.width,
      front.height,
    ),
    surfaceRole,
    background: component.type === "binder" ? "#ffffff00" : "#ffffffff",
  };
  const last = doc.pages.findLastIndex((p) => p.componentId === componentId);
  doc.pages.splice(last + 1, 0, page);
  return page;
}
function deleteNodes(doc, ids) {
  for (const id of ids) {
    const node = doc.nodes[id];
    if (node?.type === "group") deleteNodes(doc, node.childIds);
    delete doc.nodes[id];
  }
}
export function removePage(doc, pageId) {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Unknown page");
  if (
    pageComponent(doc, page)?.kind === "cover" &&
    ["front", "back"].includes(page.surfaceRole)
  )
    throw new Error("Remove the cover as a whole");
  if (
    pageComponent(doc, page)?.kind === "paper" &&
    doc.pages.filter((p) => pageComponent(doc, p)?.kind === "paper").length <= 1
  )
    throw new Error("Keep at least one menu paper page");
  deleteNodes(doc, page.rootIds);
  doc.pages = doc.pages.filter((p) => p.id !== pageId);
  if (!doc.pages.some((p) => p.componentId === page.componentId))
    delete doc.production.components[page.componentId];
}
export function removeCover(doc) {
  const ids = new Set(
    Object.entries(doc.production.components)
      .filter(([, c]) => c.kind === "cover")
      .map(([id]) => id),
  );
  for (const page of doc.pages)
    if (ids.has(page.componentId)) deleteNodes(doc, page.rootIds);
  doc.pages = doc.pages.filter((p) => !ids.has(p.componentId));
  for (const id of ids) delete doc.production.components[id];
}
export function duplicatePage(doc, pageId) {
  if (doc.pages.length >= 100)
    throw new Error("Documents support at most 100 surfaces");
  const source = doc.pages.find((p) => p.id === pageId);
  if (!source || pageComponent(doc, source)?.kind !== "paper")
    throw new Error("Choose a menu paper page");
  const page = clone(source);
  page.id = uid("page");
  page.name += " copy";
  // A duplicate is fixed artwork, independent of template content regeneration.
  delete page.extensions["com.sizzle.menu"];
  function duplicate(id) {
    const node = clone(doc.nodes[id]),
      nextId = uid("n");
    delete node.extensions["com.sizzle.editor"];
    delete node.extensions["com.sizzle.template"];
    if (node.type === "group") node.childIds = node.childIds.map(duplicate);
    doc.nodes[nextId] = node;
    return nextId;
  }
  page.rootIds = source.rootIds.map(duplicate);
  doc.pages.splice(doc.pages.indexOf(source) + 1, 0, page);
  return page;
}
// Early template captures included an opaque paper rectangle as well as the
// page background. Remove that redundant layer only on an explicit page edit.
function removeLegacyBackground(doc, page) {
  const id = page.rootIds[0],
    node = doc.nodes[id];
  if (
    node?.type === "rect" &&
    node.name === "Rect" &&
    node.fill?.type === "solid" &&
    node.fill.color === page.background &&
    !node.stroke &&
    node.opacity === 1 &&
    node.frame.width === page.width &&
    node.frame.height === page.height &&
    node.transform.x === 0 &&
    node.transform.y === 0 &&
    node.transform.rotation === 0 &&
    node.transform.scaleX === 1 &&
    node.transform.scaleY === 1
  ) {
    page.rootIds.shift();
    delete doc.nodes[id];
  }
}
export function setPageBackground(doc, pageId, background) {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Unknown page");
  if (!/^#[0-9a-f]{8}$/.test(background))
    throw new Error("Invalid background colour");
  removeLegacyBackground(doc, page);
  page.background = background;
}
export function resizePage(doc, pageId, width, height) {
  if (![width, height].every((n) => Number.isFinite(n) && n >= 36 && n <= 7200))
    throw new Error("Page dimensions must be between 0.5 and 100 inches");
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Unknown page");
  removeLegacyBackground(doc, page);
  page.width = width;
  page.height = height;
  // Artwork coordinates and type sizes intentionally stay unchanged.
}
export function selectExportPages(
  doc,
  { part = "all", componentId, pageId } = {},
) {
  if (!["all", "cover", "paper"].includes(part))
    throw new Error("Unknown export part");
  if (
    componentId &&
    !Object.hasOwn(doc.production?.components || {}, componentId)
  )
    throw new Error("Unknown component");
  const pages = doc.pages.filter(
    (p) =>
      (!pageId || p.id === pageId) &&
      (!componentId || p.componentId === componentId) &&
      (part === "all" || (pageComponent(doc, p)?.kind || "paper") === part),
  );
  if (!pages.length) throw new Error("No surfaces match this export");
  return pages;
}
export function productionWarnings(doc) {
  const warnings = [];
  const covers = doc.pages.filter(
    (p) =>
      pageComponent(doc, p)?.kind === "cover" &&
      ["front", "back"].includes(p.surfaceRole),
  );
  const papers = doc.pages.filter(
    (p) => pageComponent(doc, p)?.kind === "paper",
  );
  if (
    covers.some((c) =>
      papers.some((p) => p.width > c.width || p.height > c.height),
    )
  )
    warnings.push(
      "A menu page is larger than the cover. Check the finished product dimensions.",
    );
  return warnings;
}
