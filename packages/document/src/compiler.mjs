import { create } from "fontkit";
import { Buffer } from "buffer";
import LineBreakerModule from "linebreak";
import bidiFactory from "bidi-js";
import GraphemerModule from "graphemer";
import { validate, textInputHash, fontClosure } from "./validation.mjs";
import { allContents, verifyResource } from "./index.mjs";
import { expandCheckpoint, compactCheckpoint } from "./history.mjs";

const LineBreaker = LineBreakerModule.default || LineBreakerModule;
const Graphemer = GraphemerModule.default || GraphemerModule;
const graphemes = new Graphemer();
const bidi = bidiFactory();
const number = (n) => Number(n.toFixed(9)).toString();

function outline(glyph, scale, x, baseline) {
  let out = "";
  const point = (a, b) =>
    `${number(x + a * scale)} ${number(baseline - b * scale)}`;
  for (const command of glyph.path.commands) {
    const a = command.args;
    if (command.command === "moveTo") out += `M ${point(a[0], a[1])} `;
    else if (command.command === "lineTo") out += `L ${point(a[0], a[1])} `;
    else if (command.command === "quadraticCurveTo")
      out += `Q ${point(a[0], a[1])} ${point(a[2], a[3])} `;
    else if (command.command === "bezierCurveTo")
      out += `C ${point(a[0], a[1])} ${point(a[2], a[3])} ${point(a[4], a[5])} `;
    else if (command.command === "closePath") out += "Z ";
    else throw new Error("Unsupported font outline command");
  }
  return out.trim();
}

/** Same pure JS font/layout build runs in the editor and API worker. */
export function compileDocument(input, resourceBytes) {
  const compact = input.editorState?.version === 2;
  const doc = expandCheckpoint(input);
  // Client supplied paths are never treated as evidence of trusted compilation.
  for (const content of allContents(doc)) {
    content.layoutStatus = "draft";
    for (const n of Object.values(content.nodes))
      if (n.type === "text") n.text.layout = null;
  }
  // Editor/history schemas require ready snapshots. Validate each content without
  // session state while compiling, then validate the complete checkpoint below.
  const parsed = new Map();
  let shapingBudget = 0;
  for (const content of allContents(doc)) {
    const { editorState, ...snapshot } = content;
    validate(snapshot);
    function face(id) {
      const declaration = content.fonts[id],
        resource = content.resources[declaration.resourceId];
      const key = resource.sha256 + JSON.stringify(declaration.axes);
      if (!parsed.has(key)) {
        const bytes =
          resourceBytes[resource.sha256] ||
          resourceBytes[declaration.resourceId];
        verifyResource(resource, bytes);
        let f = create(Buffer.from(bytes));
        if (!f.unitsPerEm || !f.layout || f.fonts)
          throw new Error("Expected one outline font face");
        if (Object.keys(declaration.axes).length) {
          for (const [tag, value] of Object.entries(declaration.axes)) {
            const axis = f.variationAxes?.[tag];
            if (!axis || value < axis.min || value > axis.max)
              throw new Error(`Invalid font axis ${tag}`);
          }
          f = f.getVariation(declaration.axes);
        }
        parsed.set(key, f);
      }
      return parsed.get(key);
    }
    for (const node of Object.values(content.nodes)) {
      if (node.type !== "text") continue;
      const p = node.text.paragraph,
        runs = node.text.runs;
      const units = [];
      for (const run of runs) {
        const allowed = [
          run.fontId,
          ...Object.keys(fontClosure(content, [run.fontId])).filter(
            (id) => id !== run.fontId,
          ),
        ];
        let offset = 0;
        for (const original of graphemes.splitGraphemes(run.text)) {
          const start = offset,
            end = (offset += [...original].length);
          const text =
            run.textCase === "uppercase"
              ? original.toLocaleUpperCase(p.language)
              : run.textCase === "lowercase"
                ? original.toLocaleLowerCase(p.language)
                : original;
          if (text === "\n" || text === "\r\n" || text === "\r") {
            units.push({ text: "\n", run, start, end, fontId: run.fontId });
            continue;
          }
          const fontId = allowed.find((id) =>
            [...text].every(
              (c) =>
                /[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufe0e\ufe0f]/u.test(
                  c,
                ) || face(id).hasGlyphForCodePoint(c.codePointAt(0)),
            ),
          );
          if (!fontId)
            throw new Error(
              `Missing glyph in run ${run.id}: ${JSON.stringify(original)}`,
            );
          units.push({ text, run, start, end, fontId });
        }
      }
      function shape(line) {
        const str = line.map((u) => u.text).join("");
        shapingBudget += str.length;
        if (shapingBudget > 3000000)
          throw new Error("Text shaping budget exceeded");
        if (!str) return { segments: [], width: 0 };
        const levels = bidi.getEmbeddingLevels(
          str,
          p.direction === "auto" ? undefined : p.direction,
        );
        const visual = bidi.getReorderedIndices(str, levels);
        let at = 0;
        const segments = [];
        for (const unit of line) {
          const level = levels.levels[at],
            previous = segments.at(-1);
          if (
            previous &&
            previous.fontId === unit.fontId &&
            previous.run.id === unit.run.id &&
            previous.level === level
          ) {
            previous.text += unit.text;
            previous.end = unit.end;
            previous.utfEnd = at + unit.text.length;
          } else
            segments.push({
              ...unit,
              level,
              utfStart: at,
              utfEnd: at + unit.text.length,
            });
          at += unit.text.length;
        }
        for (const segment of segments) {
          segment.order = Math.min(
            ...visual.map((logical, i) =>
              logical >= segment.utfStart && logical < segment.utfEnd
                ? i
                : Infinity,
            ),
          );
          const f = face(segment.fontId),
            decl = content.fonts[segment.fontId];
          const features = Object.fromEntries(
            Object.entries(decl.features).map(([tag, value]) => [
              tag,
              value !== 0,
            ]),
          );
          if (
            Object.values(decl.features).some(
              (value) => value !== 0 && value !== 1,
            )
          )
            throw new Error(
              "This render profile supports boolean OpenType features only",
            );
          segment.shaped = f.layout(
            segment.text,
            features,
            undefined,
            p.language,
            segment.level % 2 ? "rtl" : "ltr",
          );
          segment.scale = segment.run.fontSize / f.unitsPerEm;
          segment.width =
            segment.shaped.positions.reduce(
              (n, v) => n + v.xAdvance * segment.scale,
              0,
            ) +
            Math.max(0, segment.shaped.glyphs.length - 1) *
              segment.run.letterSpacing;
          if (
            segment.shaped.glyphs.some(
              (g) => g.id === 0 || g.layers || g.getImageForSize,
            )
          )
            throw new Error("Missing or unsupported colour/bitmap glyph");
        }
        segments.sort((a, b) => a.order - b.order);
        return { segments, width: segments.reduce((n, s) => n + s.width, 0) };
      }
      const text = units.map((u) => u.text).join(""),
        breaks = new Set();
      const breaker = new LineBreaker(text);
      for (let b; (b = breaker.nextBreak());) breaks.add(b.position);
      const lines = [];
      let line = [],
        lastBreak = 0,
        utf = 0,
        lineStart = 0;
      function push(values, lastInParagraph) {
        lines.push({ values, lastInParagraph, ...shape(values) });
      }
      for (const unit of units) {
        if (unit.text === "\n") {
          push(line, true);
          line = [];
          utf++;
          lineStart = utf;
          lastBreak = 0;
          continue;
        }
        line.push(unit);
        utf += unit.text.length;
        const breakHere = p.wrap === "character" || breaks.has(utf);
        if (
          p.wrap !== "none" &&
          line.length > 1 &&
          shape(line).width > node.frame.width &&
          lastBreak > 0
        ) {
          const left = line.slice(0, lastBreak),
            right = line.slice(lastBreak);
          push(left, false);
          line = right;
          lineStart += left.reduce((n, u) => n + u.text.length, 0);
          lastBreak = 0;
        }
        if (breakHere) lastBreak = line.length;
      }
      push(line, true);
      const totalHeight = lines.length * p.lineHeight;
      const shiftY =
        p.verticalAlign === "middle"
          ? (node.frame.height - totalHeight) / 2
          : p.verticalAlign === "bottom"
            ? node.frame.height - totalHeight
            : 0;
      const layout = {
        inputHash: textInputHash(content, node),
        lines: [],
        fragments: [],
      };
      lines.forEach((line, lineIndex) => {
        const metrics = line.segments.length
          ? line.segments.map((s) => ({
              ascent: face(s.fontId).ascent * s.scale,
              descent: -face(s.fontId).descent * s.scale,
            }))
          : [
              {
                ascent:
                  (face(runs[0].fontId).ascent * runs[0].fontSize) /
                  face(runs[0].fontId).unitsPerEm,
                descent:
                  (-face(runs[0].fontId).descent * runs[0].fontSize) /
                  face(runs[0].fontId).unitsPerEm,
              },
            ];
        const ascent = Math.max(...metrics.map((m) => m.ascent)),
          descent = Math.max(...metrics.map((m) => m.descent));
        const baselineY =
          shiftY +
          lineIndex * p.lineHeight +
          (p.lineHeight - ascent - descent) / 2 +
          ascent;
        const x =
          p.align === "center"
            ? (node.frame.width - line.width) / 2
            : p.align === "right"
              ? node.frame.width - line.width
              : 0;
        const spaces = line.segments.reduce(
          (n, s) => n + [...s.text].filter((c) => c === " ").length,
          0,
        );
        const extra =
          p.align === "justify" && !line.lastInParagraph && spaces
            ? Math.max(0, node.frame.width - line.width) / spaces
            : 0;
        layout.lines.push({
          x,
          baselineY,
          width: line.width + extra * spaces,
          ascent,
          descent,
        });
        let penX = x;
        for (const segment of line.segments) {
          let d = "",
            penY = 0;
          const startX = penX;
          segment.shaped.glyphs.forEach((glyph, index) => {
            const position = segment.shaped.positions[index];
            d +=
              outline(
                glyph,
                segment.scale,
                penX + position.xOffset * segment.scale,
                baselineY - penY - position.yOffset * segment.scale,
              ) + " ";
            penX += position.xAdvance * segment.scale;
            penY += position.yAdvance * segment.scale;
            if (index < segment.shaped.glyphs.length - 1)
              penX += segment.run.letterSpacing;
            if (glyph.codePoints.includes(32)) penX += extra;
          });
          if (segment.run.underline && penX > startX) {
            const y = baselineY + segment.run.fontSize * 0.1,
              h = Math.max(0.25, segment.run.fontSize / 18);
            d += `M ${number(startX)} ${number(y)} L ${number(penX)} ${number(y)} L ${number(penX)} ${number(y + h)} L ${number(startX)} ${number(y + h)} Z`;
          }
          if (d.trim())
            layout.fragments.push({
              runId: segment.run.id,
              start: segment.start,
              end: segment.end,
              fontId: segment.fontId,
              lineIndex,
              d: d.trim(),
            });
        }
      });
      node.text.layout = layout;
    }
    content.layoutStatus = "ready";
  }
  validate(doc);
  return compact ? compactCheckpoint(doc) : doc;
}

/** Inspect uploaded font faces without relying on host-installed fonts. */
export function inspectFont(bytes) {
  const font = create(Buffer.from(bytes));
  if (!font.layout || !font.unitsPerEm || font.fonts)
    throw new Error("Expected one outline font face");
  const axes = Object.fromEntries(
    Object.entries(font.variationAxes || {}).map(([tag, axis]) => [
      tag,
      { min: axis.min, max: axis.max, default: axis.default },
    ]),
  );
  return {
    family: font.name.records.preferredFamily?.en || font.familyName,
    weight: font["OS/2"]?.usWeightClass || 400,
    italic: Boolean(
      font.head?.macStyle?.italic || font["OS/2"]?.fsSelection?.italic,
    ),
    axes,
  };
}
