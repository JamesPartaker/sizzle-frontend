import { COVER_TYPES } from "./production.mjs";
import Ajv2020 from "ajv/dist/2020.js";
import schema from "../document.schema.json" with { type: "json" };
import { sha256 as digest } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { expandCheckpoint } from "./history.mjs";
export const sha256 = (value) =>
  bytesToHex(digest(typeof value === "string" ? utf8ToBytes(value) : value));
const Ajv = Ajv2020.default || Ajv2020;
const ajv = new Ajv({
  strict: false,
  allErrors: true,
  validateFormats: true,
  discriminator: true,
});
ajv.addFormat("date-time", {
  type: "string",
  validate: (value) =>
    /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)),
});
const tagged = structuredClone(schema);
tagged.$defs.node.discriminator = { propertyName: "type" };
const check = ajv.compile(tagged);
const fail = (path, message) => {
  throw new Error(`${path}: ${message}`);
};

// JCS for the interoperable JSON values admitted by this proposal. JS sorting
// uses UTF-16 code units; JSON.stringify supplies ECMAScript number spelling.
export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
    .join(",")}}`;
}

function interoperable(value, path = "$") {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
      fail(path, "number outside interoperable range");
  } else if (typeof value === "string") {
    if (
      value.includes("\0") ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
        value,
      )
    )
      fail(path, "NUL or unpaired surrogate");
  } else if (Array.isArray(value))
    value.forEach((v, i) => interoperable(v, `${path}[${i}]`));
  else if (value && typeof value === "object")
    for (const [key, v] of Object.entries(value)) {
      interoperable(key, path);
      interoperable(v, `${path}.${key}`);
    }
}

export function fontClosure(doc, fontIds) {
  const found = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) fail(`fonts.${id}`, "fallback cycle");
    if (found.has(id)) return;
    const face = Object.hasOwn(doc.fonts, id) ? doc.fonts[id] : undefined;
    if (!face) fail(`fonts.${id}`, "missing font");
    visiting.add(id);
    found.add(id);
    for (const fallback of face.fallbackFontIds) visit(fallback);
    visiting.delete(id);
  }
  fontIds.forEach(visit);
  return Object.fromEntries([...found].map((id) => [id, doc.fonts[id]]));
}

export function textInputHash(doc, node) {
  const { layout, ...text } = node.text;
  const fonts = fontClosure(
    doc,
    text.runs.map((r) => r.fontId),
  );
  const resources = Object.fromEntries(
    Object.values(fonts).map((f) => [
      f.resourceId,
      doc.resources[f.resourceId],
    ]),
  );
  return sha256(
    canonical({
      frame: node.frame,
      text,
      renderProfile: doc.renderProfile,
      fonts,
      resources,
    }),
  );
}

function pathData(d, path) {
  const tokens =
    d.match(/[MLQCZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  if (
    d.replace(
      /[MLQCZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?|[\s,]/g,
      "",
    ).length
  )
    fail(path, "invalid path token");
  const arity = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  if (tokens[0] !== "M") fail(path, "path must start with M");
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (!(command in arity)) fail(path, "missing path command");
    let count = 0;
    while (i < tokens.length && !(tokens[i] in arity)) {
      const n = Number(tokens[i++]);
      if (!Number.isFinite(n) || Math.abs(n) > 1000000)
        fail(path, "path coordinate bounds");
      count++;
    }
    if (
      arity[command] === 0
        ? count !== 0
        : count === 0 || count % arity[command] !== 0
    )
      fail(path, "path command arity");
  }
}

function semantic(doc, path = "$") {
  if (Object.keys(doc.nodes).length > 10000) fail(path, "node limit");
  const pageIds = doc.pages.map((p) => p.id);
  if (new Set(pageIds).size !== pageIds.length)
    fail(path, "duplicate page IDs");
  if (doc.production) {
    const components = doc.production.components;
    let covers = 0;
    for (const [id, component] of Object.entries(components)) {
      const pages = doc.pages.filter((p) => p.componentId === id);
      if (!pages.length) fail(path, `component ${id} has no surfaces`);
      if (component.kind === "cover") {
        covers++;
        const capabilities = COVER_TYPES[component.type];
        if (
          !capabilities.materials.includes(component.material) ||
          !capabilities.decorations.includes(component.decoration)
        )
          fail(path, "unsupported cover options");
        const roles = pages.map((p) => p.surfaceRole);
        if (roles.some((role) => !capabilities.surfaces.includes(role)))
          fail(path, "unsupported cover surface");
        if (
          !roles.includes("front") ||
          !roles.includes("back") ||
          new Set(roles).size !== roles.length ||
          roles.includes(undefined)
        )
          fail(path, "cover requires unique front and back surfaces");
      } else if (pages.some((p) => p.surfaceRole))
        fail(path, "paper cannot have cover surface roles");
    }
    if (covers > 1) fail(path, "a menu supports one cover");
    for (const page of doc.pages) {
      if (!Object.hasOwn(components, page.componentId || ""))
        fail(path, "page component missing");
    }
    if (!Object.values(components).some((c) => c.kind === "paper"))
      fail(path, "menu requires paper pages");
  } else if (doc.pages.some((p) => p.componentId || p.surfaceRole))
    fail(path, "production metadata missing");
  const assigned = new Set();
  const image = (id, p) => {
    const res = Object.hasOwn(doc.resources, id)
      ? doc.resources[id]
      : undefined;
    if (!res || res.kind !== "image") fail(p, "missing image resource");
    return res;
  };
  const paint = (fill, p) => {
    if (fill?.type === "pattern") image(fill.resourceId, p);
  };
  for (const [id, face] of Object.entries(doc.fonts)) {
    if (doc.resources[face.resourceId]?.kind !== "font")
      fail(`${path}.fonts.${id}`, "missing font resource");
    fontClosure(doc, [id]);
  }
  const resourceVersions = new Map();
  for (const resource of Object.values(doc.resources)) {
    const key = canonical(resource.source);
    if (
      resourceVersions.has(key) &&
      resourceVersions.get(key) !== resource.sha256
    )
      fail(path, "same immutable resource has different hashes");
    resourceVersions.set(key, resource.sha256);
    if (
      resource.kind === "image" &&
      resource.pixelWidth * resource.pixelHeight > 40000000
    )
      fail(path, "image pixel budget");
  }
  function visit(id, ancestors = []) {
    if (ancestors.length > 32) fail(path, "group depth");
    if (ancestors.includes(id)) fail(path, "group cycle");
    if (assigned.has(id)) fail(path, `node ${id} has multiple owners`);
    const node = Object.hasOwn(doc.nodes, id) ? doc.nodes[id] : undefined;
    if (!node) fail(path, `missing node ${id}`);
    assigned.add(id);
    const p = `${path}.nodes.${id}`;
    if (node.type === "group")
      node.childIds.forEach((child) => visit(child, [...ancestors, id]));
    if (
      node.type === "rect" &&
      node.cornerRadius > Math.min(node.frame.width, node.frame.height) / 2
    )
      fail(p, "corner radius exceeds box");
    paint(node.fill, p);
    if (
      node.stroke?.dash.length &&
      node.stroke.dash.reduce((a, b) => a + b, 0) === 0
    )
      fail(p, "empty dash period");
    if (node.type === "path") pathData(node.d, p);
    if (node.type === "image") {
      const res = image(node.resourceId, p),
        crop = node.crop;
      if (
        crop.x < 0 ||
        crop.y < 0 ||
        crop.x + crop.width > res.pixelWidth ||
        crop.y + crop.height > res.pixelHeight
      )
        fail(p, "image crop outside source");
    }
    if (node.type === "text") {
      const runs = node.text.runs;
      if (new Set(runs.map((r) => r.id)).size !== runs.length)
        fail(p, "duplicate text run IDs");
      if (runs.reduce((n, r) => n + [...r.text].length, 0) > 100000)
        fail(p, "text length budget");
      runs.forEach((r) => fontClosure(doc, [r.fontId]));
      if (doc.layoutStatus === "ready") {
        const layout = node.text.layout;
        if (!layout) fail(p, "ready text requires layout");
        if (layout.inputHash !== textInputHash(doc, node))
          fail(p, "stale layout input hash");
        for (const fragment of layout.fragments) {
          const run = runs.find((r) => r.id === fragment.runId);
          if (
            !run ||
            fragment.start >= fragment.end ||
            fragment.end > [...run.text].length
          )
            fail(p, "invalid source range");
          if (!Object.hasOwn(fontClosure(doc, [run.fontId]), fragment.fontId))
            fail(p, "unapproved fallback face");
          if (fragment.lineIndex >= layout.lines.length)
            fail(p, "missing line");
          pathData(fragment.d, p);
        }
      }
    }
  }
  doc.pages.forEach((page) => page.rootIds.forEach((id) => visit(id)));
  if (assigned.size !== Object.keys(doc.nodes).length)
    fail(path, "orphan node");
  if (doc.editorState) {
    const editor = doc.editorState,
      visible = editor.preview?.document || doc;
    if (!visible.pages.some((p) => p.id === editor.activePageId))
      fail(path, "active page missing");
    for (const id of editor.selectionIds)
      if (!visible.nodes[id]) fail(path, "selection node missing");
    for (const id of editor.panels.expandedNodeIds)
      if (visible.nodes[id]?.type !== "group")
        fail(path, "expanded group missing");
    const historyIds = new Set();
    for (const direction of ["past", "future"])
      for (const entry of editor.history[direction]) {
        if (historyIds.has(entry.id)) fail(path, "duplicate history IDs");
        historyIds.add(entry.id);
        semantic(entry.document, `${path}.editorState.history.${direction}`);
      }
    if (editor.preview)
      semantic(editor.preview.document, `${path}.editorState.preview`);
  }
}

export function validate(doc) {
  interoperable(doc);
  if (!check(doc)) throw new Error(JSON.stringify(check.errors?.slice(0, 8)));
  if (doc.editorState?.version === 2) {
    validate(expandCheckpoint(doc));
    return;
  }
  semantic(doc);
  const redo =
    doc.editorState?.extensions?.["com.sizzle.editor"]?.redoPreview?.document;
  if (redo) {
    if (redo.editorState || redo.layoutStatus !== "ready")
      throw new Error("Invalid redo preview checkpoint");
    validate(redo);
  }
}
