import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDocument,
  ensureProduction,
  addCover,
  addCoverSurface,
  addPaperPage,
  duplicatePage,
  removePage,
  removeCover,
  resizePage,
  selectExportPages,
  productionWarnings,
  validate,
  renderPage,
  identity,
  compactCheckpoint,
  expandCheckpoint,
  contentSnapshot,
  canonical,
} from "../src/index.mjs";

test("legacy pages migrate without changing geometry or artwork; mixed dimensions stay independent", () => {
  const doc = emptyDocument();
  const before = structuredClone(doc.pages[0]);
  ensureProduction(doc);
  assert.deepEqual(doc.pages[0], { ...before, componentId: "paper_main" });
  const insert = addPaperPage(doc, {
    componentId: "paper_main",
    width: 420,
    height: 595,
  });
  validate(doc);
  assert.deepEqual(
    doc.pages.map((p) => [p.width, p.height]),
    [
      [612, 792],
      [420, 595],
    ],
  );
  assert.equal(insert.componentId, doc.pages[0].componentId);
  const once = canonical(doc);
  ensureProduction(doc);
  assert.equal(canonical(doc), once);
});
test("covers require supported product options and unique front/back surfaces", () => {
  const doc = ensureProduction(emptyDocument());
  const cover = addCover(doc);
  validate(doc);
  const component = doc.production.components[cover.componentId];
  const artwork = renderPage(doc, cover.id, {});
  component.materialColor = "#112233ff";
  assert.equal(
    renderPage(doc, cover.id, {}),
    artwork,
    "material preview must not alter print artwork",
  );
  assert.equal(cover.background, "#ffffff00");
  component.material = "card";
  assert.throws(() => validate(doc), /unsupported cover options/);
  component.material = "leather";
  component.decoration = "print";
  assert.throws(() => validate(doc), /unsupported cover options/);
  component.decoration = "foil";
  doc.pages[1].surfaceRole = "front";
  assert.throws(() => validate(doc), /front and back/);
  doc.pages[1].surfaceRole = "back";
  doc.pages[2].componentId = "missing";
  assert.throws(() => validate(doc), /no surfaces|component missing/);
});
test("duplication copies the entire graph and remains independent; resize preserves artwork", () => {
  const doc = ensureProduction(emptyDocument()),
    p = doc.pages[0];
  p.rootIds = ["group"];
  doc.nodes.group = {
    type: "group",
    name: "Artwork",
    frame: { width: 40, height: 20 },
    transform: identity(10, 20),
    visible: true,
    locked: false,
    opacity: 1,
    extensions: {},
    clip: null,
    childIds: ["rect"],
  };
  doc.nodes.rect = {
    type: "rect",
    name: "Shape",
    frame: { width: 40, height: 20 },
    transform: identity(),
    visible: true,
    locked: false,
    opacity: 1,
    extensions: {},
    fill: { type: "solid", color: "#ff0000ff" },
    stroke: null,
    cornerRadius: 0,
  };
  const artwork = canonical(doc.nodes);
  resizePage(doc, p.id, 420, 595);
  assert.equal(canonical(doc.nodes), artwork);
  const second = duplicatePage(doc, p.id);
  assert.notEqual(second.rootIds[0], p.rootIds[0]);
  assert.notEqual(doc.nodes[second.rootIds[0]].childIds[0], "rect");
  validate(doc);
  removePage(doc, p.id);
  validate(doc);
  assert.equal(doc.nodes.group, undefined);
  assert.throws(() => removePage(doc, second.id), /at least one/);
});
test("exports select cover and paper independently and exclude no matching surfaces explicitly", () => {
  const doc = ensureProduction(emptyDocument());
  assert.throws(() => selectExportPages(doc, { part: "cover" }), /No surfaces/);
  const cover = addCover(doc);
  assert.equal(selectExportPages(doc, { part: "cover" }).length, 2);
  assert.equal(selectExportPages(doc, { part: "paper" }).length, 1);
  assert.equal(
    selectExportPages(doc, { componentId: cover.componentId }).length,
    2,
  );
  assert.throws(
    () => selectExportPages(doc, { componentId: "unknown" }),
    /Unknown/,
  );
  assert.throws(() => selectExportPages(doc, { part: "invalid" }), /Unknown/);
  assert.throws(() => removePage(doc, cover.id), /whole/);
  doc.pages[2].width = 900;
  assert.equal(productionWarnings(doc).length, 1);
  removeCover(doc);
  validate(doc);
  assert.equal(doc.pages.length, 1);
});
test("component settings and mixed page sizes survive compact undo/redo checkpoints", () => {
  const doc = ensureProduction(emptyDocument());
  const before = contentSnapshot(doc);
  const cover = addCover(doc);
  doc.production.components[cover.componentId].materialColor = "#884422ff";
  addPaperPage(doc, { width: 420, height: 595 });
  doc.editorState = {
    version: 1,
    activePageId: cover.id,
    selectionIds: [],
    viewport: { zoom: 1, centerX: 0, centerY: 0 },
    panels: { activeTab: "design", expandedNodeIds: [] },
    guidesVisible: false,
    rulersVisible: false,
    snapEnabled: true,
    history: {
      past: [
        {
          id: "history_cover",
          label: "Before cover",
          at: new Date().toISOString(),
          document: before,
        },
      ],
      future: [],
    },
    preview: null,
    extensions: {},
  };
  const checkpoint = compactCheckpoint(doc);
  validate(checkpoint);
  assert.deepEqual(expandCheckpoint(checkpoint), doc);
  assert.deepEqual(
    expandCheckpoint(checkpoint).editorState.history.past[0].document,
    before,
  );
});

test("optional cover surfaces follow product capabilities and can be removed independently", () => {
  const doc = ensureProduction(emptyDocument()),
    front = addCover(doc);
  const spine = addCoverSurface(doc, front.componentId, "spine");
  assert.equal(spine.width, 36);
  assert.deepEqual(productionWarnings(doc), []);
  validate(doc);
  assert.throws(
    () => addCoverSurface(doc, front.componentId, "spine"),
    /already exists/,
  );
  removePage(doc, spine.id);
  validate(doc);
  doc.production.components[front.componentId] = {
    kind: "cover",
    name: "Printed",
    type: "printed",
    material: "card",
    decoration: "print",
    materialColor: "#ffffffff",
    decorationColor: "#000000ff",
  };
  assert.throws(
    () => addCoverSurface(doc, front.componentId, "spine"),
    /Unsupported/,
  );
  addCoverSurface(doc, front.componentId, "inside-front");
  validate(doc);
});

test("paper groups persist an optional menu or inside-slip role", () => {
  const doc = ensureProduction(emptyDocument());
  doc.production.components.paper_main.role = "inside-slip";
  validate(doc);
  assert.equal(
    JSON.parse(JSON.stringify(doc)).production.components.paper_main.role,
    "inside-slip",
  );
  doc.production.components.paper_main.role = "other";
  assert.throws(() => validate(doc));
});
