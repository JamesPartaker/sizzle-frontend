import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileDocument, inspectFont } from "../src/compiler.mjs";
import {
  validate,
  canonical,
  sha256,
  renderPage,
  editText,
  resourceList,
  emptyDocument,
  normalizePath,
  compactCheckpoint,
  expandCheckpoint,
} from "../src/index.mjs";

const authored = JSON.parse(
  readFileSync(new URL("./authored.json", import.meta.url)),
);
const bytes = Object.fromEntries(
  ["Go-Regular.ttf", "sizzle-logo.png"].map((name) => {
    const b = readFileSync(new URL("../assets/" + name, import.meta.url));
    return [sha256(b), b];
  }),
);
const fixture = () => compileDocument(authored, bytes);

test("authoring compiles deterministically into ready editable multipage vector artwork", () => {
  const a = fixture(),
    b = fixture();
  validate(a);
  assert.equal(canonical(a), canonical(b));
  assert.equal(a.pages.length, 2);
  assert.equal(a.pages[0].width, 612);
  assert.equal(a.pages[1].width, 360);
  const svg = renderPage(a, a.pages[0].id, bytes);
  assert.match(svg, /width="612pt" height="792pt"/);
  assert.match(svg, /data:image\/png;base64,/);
  assert.doesNotMatch(svg, /<text\b|https?:\/\/[^w]/);
});
test("round trips editor state, ordering and unknown namespaces without rebuilding layout", () => {
  const a = fixture();
  a.extensions["org.example.future"] = {
    id: "9007199254740993",
    data: ["🌶️", null, 3.25],
  };
  const restored = JSON.parse(JSON.stringify(a));
  validate(restored);
  assert.deepEqual(restored, a);
  const imageBytes = {
    [a.resources.res_logo.sha256]: bytes[a.resources.res_logo.sha256],
  };
  assert.equal(
    renderPage(a, a.pages[0].id, imageBytes),
    renderPage(restored, restored.pages[0].id, imageBytes),
    "saved text renders without consulting fonts",
  );
});
test("text editing invalidates only editable intent and recompiles explicit lines", () => {
  const old = fixture(),
    draft = editText(old, "dinner_name", "Café — crème brûlée");
  assert.equal(draft.layoutStatus, "draft");
  assert.equal(draft.nodes.dinner_name.text.layout, null);
  const ready = compileDocument(draft, bytes);
  assert.notEqual(
    ready.nodes.dinner_name.text.layout.inputHash,
    old.nodes.dinner_name.text.layout.inputHash,
  );
  assert.equal(old.nodes.dinner_name.text.runs[0].text, "Roasted carrots");
  assert.equal(
    ready.nodes.dinner_name.text.runs[0].text,
    "Café — crème brûlée",
  );
});
test("empty strings, explicit blank lines and underline geometry survive compilation", () => {
  let doc = editText(fixture(), "dinner_name", "");
  doc = compileDocument(doc, bytes);
  assert.equal(doc.nodes.dinner_name.text.layout.fragments.length, 0);
  assert.equal(doc.nodes.dinner_name.text.layout.lines.length, 1);
  doc = editText(doc, "dinner_name", "A\n\nB");
  doc.nodes.dinner_name.text.runs[0].underline = true;
  const ready = compileDocument(doc, bytes);
  assert.equal(ready.nodes.dinner_name.text.layout.lines.length, 3);
  assert.match(ready.nodes.dinner_name.text.layout.fragments[0].d, / Z$/);
});
test("stale layout, missing glyphs, corrupt fonts and graph ownership fail explicitly", () => {
  const stale = fixture();
  stale.nodes.dinner_name.text.runs[0].text = "Changed";
  assert.throws(() => validate(stale), /stale/);
  const missing = editText(fixture(), "dinner_name", "🦑");
  assert.throws(() => compileDocument(missing, bytes), /glyph/i);
  assert.throws(() => compileDocument(authored, {}), /checksum/);
  const orphan = fixture();
  orphan.nodes.extra = structuredClone(orphan.nodes.dinner_name);
  assert.throws(() => validate(orphan), /orphan/);
  const inherited = emptyDocument();
  inherited.pages[0].rootIds = ["constructor"];
  inherited.nodes.unused = structuredClone(fixture().nodes.dinner_name);
  assert.throws(() => validate(inherited));
});
test("compiled client outlines are regenerated rather than trusted by matching hashes", () => {
  const ready = fixture(),
    tampered = structuredClone(ready);
  tampered.nodes.dinner_name.text.layout.fragments[0].d = "M 0 0 L 10 10 Z";
  validate(tampered);
  assert.equal(canonical(compileDocument(tampered, bytes)), canonical(ready));
});
test("resources in retained history and redo previews are pinned and immutable", () => {
  const doc = fixture();
  doc.editorState = {
    version: 1,
    activePageId: doc.pages[0].id,
    selectionIds: [],
    viewport: { zoom: 1, centerX: 306, centerY: 396 },
    panels: { activeTab: "layers", expandedNodeIds: [] },
    guidesVisible: false,
    rulersVisible: false,
    snapEnabled: true,
    history: { past: [], future: [] },
    preview: null,
    extensions: {
      "com.sizzle.editor": {
        redoPreview: { label: "Preview", document: fixture() },
      },
    },
  };
  validate(doc);
  assert.equal(resourceList(doc).length, 2);
  const changed = structuredClone(doc);
  changed.editorState.extensions[
    "com.sizzle.editor"
  ].redoPreview.document.resources.res_logo.sha256 = "0".repeat(64);
  assert.throws(() => resourceList(changed), /immutable/);
});
test("legacy SVG paths normalize to the fixed absolute command subset", () => {
  const path = normalizePath("m 2 2 h 5 v 4 a 2 2 0 0 1 2 2 z", 2);
  assert.doesNotMatch(path, /[aAbBhHvVsStTz]/);
  assert.match(path, /M/);
  assert.match(path, /C/);
});
test("compact editor history reconstructs exact past/future scenes without repeated outlines", () => {
  const doc = fixture();
  const old = structuredClone(doc);
  old.nodes.dinner_title.transform.x = 90;
  const future = structuredClone(doc);
  future.nodes.drinks_title.transform.y = 120;
  doc.editorState = {
    version: 1,
    activePageId: doc.pages[0].id,
    selectionIds: [],
    viewport: { zoom: 1, centerX: 306, centerY: 396 },
    panels: { activeTab: "design", expandedNodeIds: [] },
    guidesVisible: false,
    rulersVisible: false,
    snapEnabled: true,
    history: {
      past: [
        {
          id: "past",
          label: "Past",
          at: "2026-11-04T00:00:00Z",
          document: old,
        },
      ],
      future: [
        {
          id: "future",
          label: "Future",
          at: "2026-11-04T00:00:01Z",
          document: future,
        },
      ],
    },
    preview: null,
    extensions: {},
  };
  const packed = compactCheckpoint(doc);
  validate(packed);
  assert.equal(packed.editorState.version, 2);
  assert.deepEqual(expandCheckpoint(packed), doc);
  assert.ok(JSON.stringify(packed).length < JSON.stringify(doc).length / 2);
  assert.equal(canonical(compileDocument(packed, bytes)), canonical(packed));
  const tampered = structuredClone(packed);
  tampered.nodes.dinner_title.transform.x = 123;
  assert.throws(() => validate(tampered), /base/);
  const invalid = structuredClone(packed);
  invalid.editorState.history.past[0].patches = [
    { op: "set", path: ["__proto__", "polluted"], value: true },
  ];
  assert.throws(() => validate(invalid));
  assert.equal({}.polluted, undefined);
});

test("custom font inspection pins actual static faces and variable axis ranges", () => {
  const regular = inspectFont(
    readFileSync(new URL("../assets/Go-Regular.ttf", import.meta.url)),
  );
  assert.equal(regular.weight, 400);
  assert.equal(regular.italic, false);
  assert.deepEqual(regular.axes, {});
  const italic = inspectFont(
    readFileSync(new URL("../assets/Poppins-BoldItalic.ttf", import.meta.url)),
  );
  assert.equal(italic.weight, 700);
  assert.equal(italic.italic, true);
  const variable = inspectFont(
    readFileSync(new URL("../assets/DM-Sans.ttf", import.meta.url)),
  );
  assert.deepEqual(variable.axes.wght, { min: 100, max: 1000, default: 400 });
});
