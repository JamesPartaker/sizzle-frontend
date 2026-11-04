import { canonical, sha256 } from "./validation.mjs";

const core = (doc) => {
  const { editorState, ...content } = doc;
  return content;
};
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const same = (a, b) => a === b || canonical(a) === canonical(b);

/** Object paths avoid positional node edits. Arrays are replaced atomically so
 * page/layer/run order and Unicode strings remain exact. Unknown extensions are
 * atomic values rather than a schema that the history writer tries to infer. */
function difference(before, after, path = [], out = []) {
  if (same(before, after)) return out;
  if (object(before) && object(after) && path.at(-1) !== "extensions") {
    for (const key of Object.keys(before).sort())
      if (!Object.hasOwn(after, key))
        out.push({ op: "delete", path: [...path, key] });
    for (const key of Object.keys(after).sort()) {
      if (!Object.hasOwn(before, key))
        out.push({
          op: "set",
          path: [...path, key],
          value: structuredClone(after[key]),
        });
      else difference(before[key], after[key], [...path, key], out);
    }
  } else {
    if (!path.length)
      throw new Error("History must describe a document object");
    out.push({ op: "set", path, value: structuredClone(after) });
  }
  return out;
}
function apply(snapshot, patches) {
  const doc = structuredClone(snapshot);
  for (const patch of patches) {
    if (
      !Array.isArray(patch.path) ||
      !patch.path.length ||
      patch.path.length > 64
    )
      throw new Error("Invalid history path");
    let parent = doc;
    for (const key of patch.path.slice(0, -1)) {
      if (!object(parent) || !Object.hasOwn(parent, key))
        throw new Error("History path does not exist");
      parent = parent[key];
    }
    if (!object(parent))
      throw new Error("History cannot address inside an array");
    const key = patch.path.at(-1);
    if (patch.op === "delete") {
      if (!Object.hasOwn(parent, key))
        throw new Error("History deletion does not exist");
      delete parent[key];
    } else if (patch.op === "set") {
      Object.defineProperty(parent, key, {
        value: structuredClone(patch.value),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else throw new Error("Unknown history operation");
  }
  return doc;
}

export function compactCheckpoint(input) {
  if (!input.editorState) return structuredClone(input);
  const doc = input.editorState.version === 2 ? expandCheckpoint(input) : input;
  const content = core(doc),
    editor = doc.editorState;
  const { history, ...session } = editor;
  const result = {
    ...structuredClone(content),
    editorState: {
      ...structuredClone(session),
      version: 2,
      history: { baseHash: sha256(canonical(content)), past: [], future: [] },
    },
  };
  for (const direction of ["past", "future"]) {
    let previous = content;
    const entries = history[direction],
      compact = new Array(entries.length);
    for (let i = entries.length - 1; i >= 0; i--) {
      const { document, ...meta } = entries[i];
      compact[i] = { ...meta, patches: difference(previous, document) };
      previous = document;
    }
    result.editorState.history[direction] = compact;
  }
  return result;
}

export function expandCheckpoint(input) {
  if (input.editorState?.version !== 2) return structuredClone(input);
  const content = core(input),
    { history, ...session } = input.editorState;
  if (history.baseHash !== sha256(canonical(content)))
    throw new Error("History base does not match the document");
  const result = {
    ...structuredClone(content),
    editorState: {
      ...structuredClone(session),
      version: 1,
      history: { past: [], future: [] },
    },
  };
  for (const direction of ["past", "future"]) {
    let previous = content;
    const entries = history[direction],
      expanded = new Array(entries.length);
    for (let i = entries.length - 1; i >= 0; i--) {
      const { patches, ...meta } = entries[i];
      previous = apply(previous, patches);
      expanded[i] = { ...meta, document: previous };
    }
    result.editorState.history[direction] = expanded;
  }
  return result;
}
