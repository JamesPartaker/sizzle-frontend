export {
  COVER_TYPES,
  ensureProduction,
  pageComponent,
  menuPages,
  addPaperPage,
  addCover,
  addCoverSurface,
  removePage,
  removeCover,
  duplicatePage,
  resizePage,
  setPageBackground,
  selectExportPages,
  productionWarnings,
} from "./production.mjs";
import { Buffer } from "buffer";
import svgpath from "svgpath";
import { expandCheckpoint } from "./history.mjs";
export { compactCheckpoint, expandCheckpoint } from "./history.mjs";
export {
  validate,
  canonical,
  sha256,
  textInputHash,
  fontClosure,
} from "./validation.mjs";
import { validate, sha256, canonical } from "./validation.mjs";

export const PROFILE = Object.freeze({ id: "sizzle.fixed", version: "1.0.0" });
export const POINT_TO_PIXEL = 96 / 72;
export const identity = (x = 0, y = 0) => ({
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  originX: 0,
  originY: 0,
});
export const color = (value) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() + "ff" : value;
export function normalizePath(d, scale = 1) {
  return svgpath(d)
    .abs()
    .unshort()
    .unarc()
    .iterate((segment, index, x, y) => {
      if (segment[0] === "H") return [["L", segment[1], y]];
      if (segment[0] === "V") return [["L", x, segment[1]]];
      if (segment[0] === "z") segment[0] = "Z";
    })
    .scale(scale)
    .toString()
    .replaceAll("z", "Z");
}
export const contentSnapshot = (doc) => {
  const { editorState, ...content } = structuredClone(doc);
  return content;
};
export function emptyDocument(title = "Untitled") {
  return {
    format: "sizzle.document",
    version: 1,
    layoutStatus: "ready",
    renderProfile: { ...PROFILE },
    metadata: { title, description: "", locale: "en-CA", tags: [] },
    resources: {},
    fonts: {},
    pages: [
      {
        id: "page_1",
        name: "Page 1",
        width: 612,
        height: 792,
        bleed: { top: 0, right: 0, bottom: 0, left: 0 },
        background: "#ffffffff",
        rootIds: [],
        guides: {
          x: [],
          y: [],
          safeInset: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        extensions: {},
      },
    ],
    nodes: {},
    extensions: {},
  };
}
export function allContents(doc) {
  if (doc.editorState?.version === 2) doc = expandCheckpoint(doc);
  const redo =
    doc.editorState?.extensions?.["com.sizzle.editor"]?.redoPreview?.document;
  return [
    doc,
    ...(doc.editorState?.history.past || []).map((e) => e.document),
    ...(doc.editorState?.history.future || []).map((e) => e.document),
    ...(doc.editorState?.preview ? [doc.editorState.preview.document] : []),
    ...(redo ? [redo] : []),
  ];
}
export function resourceList(doc) {
  const bySource = new Map();
  for (const content of allContents(doc))
    for (const resource of Object.values(content.resources)) {
      const key = canonical(resource.source);
      const existing = bySource.get(key);
      if (existing && canonical(existing) !== canonical(resource))
        throw new Error("Conflicting immutable resource metadata");
      bySource.set(key, resource);
    }
  return [...bySource.values()];
}
export function verifyResource(resource, bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength !== resource.byteLength ||
    sha256(bytes) !== resource.sha256
  )
    throw new Error(`Resource checksum mismatch: ${resource.source.assetId}`);
  return bytes;
}
export function transformSVG(t) {
  return `translate(${t.x} ${t.y}) translate(${t.originX} ${t.originY}) rotate(${t.rotation}) scale(${t.scaleX} ${t.scaleY}) translate(${-t.originX} ${-t.originY})`;
}
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export function dataURL(resource, bytes) {
  verifyResource(resource, bytes);
  // Workspace uploads are verified raster images/fonts. SVG library renditions
  // must be static, self-contained artwork; never let output access the network.
  if (resource.mediaType === "image/svg+xml") {
    const svg = new TextDecoder().decode(bytes);
    if (
      /<(?:script|foreignObject|text|style|animate\w*|set|iframe|object|embed)\b|<!ENTITY|<!DOCTYPE|\bon\w+\s*=|\b(?:href|src)\s*=\s*["'](?!#)|url\s*\(/i.test(
        svg,
      )
    )
      throw new Error("Unsafe or unsupported SVG rendition");
  }
  return `data:${resource.mediaType};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Static vector artwork. This is shared by the browser and export worker. */
export function renderPage(doc, pageId, bytes, { bleed = false } = {}) {
  validate(contentSnapshot(doc));
  if (doc.layoutStatus !== "ready")
    throw new Error("Compile document before rendering");
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Unknown page");
  const defs = [],
    b = bleed ? page.bleed : { left: 0, right: 0, top: 0, bottom: 0 };
  const width = page.width + b.left + b.right,
    height = page.height + b.top + b.bottom;
  const imageURL = (id) => {
    const resource = doc.resources[id];
    const value = bytes[resource.sha256] || bytes[id];
    if (!value) throw new Error(`Unresolved image: ${id}`);
    return dataURL(resource, value);
  };
  function fill(paint) {
    if (!paint) return "none";
    if (paint.type === "solid") return paint.color;
    const id = `pattern_${defs.length}`;
    defs.push(
      `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${paint.tileWidth}" height="${paint.tileHeight}" patternTransform="translate(${paint.offsetX} ${paint.offsetY}) rotate(${paint.rotation})"><image href="${imageURL(paint.resourceId)}" width="${paint.tileWidth}" height="${paint.tileHeight}" opacity="${paint.opacity}" preserveAspectRatio="none"/></pattern>`,
    );
    return `url(#${id})`;
  }
  function clip(box) {
    const id = `clip_${defs.length}`;
    defs.push(
      `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"/></clipPath>`,
    );
    return `url(#${id})`;
  }
  function node(id) {
    const n = doc.nodes[id];
    if (!n.visible) return "";
    const { width: w, height: h } = n.frame;
    const stroke = n.stroke
      ? `stroke="${n.stroke.color}" stroke-width="${n.stroke.width}" stroke-dasharray="${n.stroke.dash.join(" ")}" stroke-linecap="${n.stroke.cap}" stroke-linejoin="${n.stroke.join}" stroke-miterlimit="${n.stroke.miterLimit}"`
      : 'stroke="none"';
    let inner;
    if (n.type === "group")
      inner = `<g${n.clip ? ` clip-path="${clip(n.clip)}"` : ""}>${n.childIds.map(node).join("")}</g>`;
    if (n.type === "rect")
      inner = `<rect width="${w}" height="${h}" rx="${n.cornerRadius}" fill="${fill(n.fill)}" ${stroke}/>`;
    if (n.type === "ellipse")
      inner = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill(n.fill)}" ${stroke}/>`;
    if (n.type === "path")
      inner = `<path d="${esc(n.d)}" fill="${fill(n.fill)}" fill-rule="${n.fillRule}" ${stroke}/>`;
    if (n.type === "image") {
      const c = n.crop,
        r = doc.resources[n.resourceId];
      inner = `<g clip-path="${clip({ x: 0, y: 0, width: w, height: h })}"><image href="${imageURL(n.resourceId)}" x="${(-c.x * w) / c.width}" y="${(-c.y * h) / c.height}" width="${(r.pixelWidth * w) / c.width}" height="${(r.pixelHeight * h) / c.height}" preserveAspectRatio="none"/></g>`;
    }
    if (n.type === "text") {
      inner = n.text.layout.fragments
        .map(
          (f) =>
            `<path d="${esc(f.d)}" fill="${n.text.runs.find((r) => r.id === f.runId).color}" fill-rule="nonzero"/>`,
        )
        .join("");
      if (n.text.paragraph.overflow === "clip")
        inner = `<g clip-path="${clip({ x: 0, y: 0, width: w, height: h })}">${inner}</g>`;
    }
    return `<g data-node-id="${id}" transform="${transformSVG(n.transform)}" opacity="${n.opacity}">${inner}</g>`;
  }
  const artwork = page.rootIds.map(node).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}"><defs>${defs.join("")}</defs><rect width="${width}" height="${height}" fill="${page.background}"/><g transform="translate(${b.left} ${b.top})">${artwork}</g></svg>`;
}

export function editText(doc, nodeId, text) {
  const next = expandCheckpoint(doc),
    node = next.nodes[nodeId];
  if (node?.type !== "text") throw new Error("Not a text node");
  // Editing a plain textarea replaces the selected node's text. Rich run-level
  // callers may edit runs directly and invalidate layout in the same way.
  node.text.runs = [{ ...node.text.runs[0], text }];
  node.text.layout = null;
  next.layoutStatus = "draft";
  return next;
}
