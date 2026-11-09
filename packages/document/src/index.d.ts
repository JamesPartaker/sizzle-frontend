export type Extensions = Record<string, unknown>;
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
}
export interface Frame {
  width: number;
  height: number;
}
export interface RectBox extends Frame {
  x: number;
  y: number;
}
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface Resource {
  kind: "image" | "font";
  source: {
    scope: "workspace" | "library";
    assetId: string;
    revisionId: string;
    renditionId: string;
  };
  mediaType: string;
  sha256: string;
  byteLength: number;
  pixelWidth?: number;
  pixelHeight?: number;
}
export interface Font {
  resourceId: string;
  family: string;
  weight: number;
  style: "normal" | "italic" | "oblique";
  axes: Record<string, number>;
  features: Record<string, number>;
  fallbackFontIds: string[];
}
export type Fill =
  | { type: "solid"; color: string }
  | {
      type: "pattern";
      resourceId: string;
      tileWidth: number;
      tileHeight: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
      opacity: number;
    };
export interface Stroke {
  color: string;
  width: number;
  dash: number[];
  cap: "butt" | "round" | "square";
  join: "miter" | "round" | "bevel";
  miterLimit: number;
}
export interface TextRun {
  id: string;
  text: string;
  fontId: string;
  fontSize: number;
  color: string;
  letterSpacing: number;
  underline: boolean;
  textCase: "none" | "uppercase" | "lowercase";
}
export interface TextLayout {
  inputHash: string;
  lines: {
    x: number;
    baselineY: number;
    width: number;
    ascent: number;
    descent: number;
  }[];
  fragments: {
    runId: string;
    start: number;
    end: number;
    fontId: string;
    lineIndex: number;
    d: string;
  }[];
}
export interface DocumentText {
  runs: TextRun[];
  paragraph: {
    align: "left" | "center" | "right" | "justify";
    direction: "ltr" | "rtl" | "auto";
    language: string;
    lineHeight: number;
    wrap: "word" | "character" | "none";
    overflow: "clip" | "visible";
    verticalAlign: "top" | "middle" | "bottom";
  };
  layout: TextLayout | null;
}
export interface NodeBase {
  name: string;
  frame: Frame;
  transform: Transform;
  opacity: number;
  visible: boolean;
  locked: boolean;
  extensions: Extensions;
}
export type DocumentNode = NodeBase &
  (
    | { type: "group"; childIds: string[]; clip: RectBox | null }
    | {
        type: "rect";
        fill: Fill | null;
        stroke: Stroke | null;
        cornerRadius: number;
      }
    | { type: "ellipse"; fill: Fill | null; stroke: Stroke | null }
    | {
        type: "path";
        fill: Fill | null;
        stroke: Stroke | null;
        fillRule: "nonzero" | "evenodd";
        d: string;
      }
    | { type: "image"; resourceId: string; crop: RectBox }
    | { type: "text"; text: DocumentText }
  );
export type CoverSurfaceRole =
  "front" | "back" | "spine" | "inside-front" | "inside-back";
export type CoverType = "binder" | "printed";
export type CoverMaterial = "leather" | "linen" | "card";
export type CoverDecoration = "none" | "print" | "foil" | "emboss";
export type ProductionComponent =
  | { kind: "paper"; name: string; stock: "uncoated" | "coated" | "recycled" }
  | {
      kind: "cover";
      name: string;
      type: CoverType;
      material: CoverMaterial;
      materialColor: string;
      decoration: CoverDecoration;
      decorationColor: string;
    };
export interface Production {
  version: 1;
  components: Record<string, ProductionComponent>;
}
export interface ExportSelection {
  part?: "all" | "cover" | "paper";
  componentId?: string;
  pageId?: string;
}
export const COVER_TYPES: Record<
  CoverType,
  {
    materials: CoverMaterial[];
    decorations: CoverDecoration[];
    surfaces: CoverSurfaceRole[];
  }
>;
export function ensureProduction<T extends DocumentContent>(
  doc: T,
): T & { production: Production };
export function pageComponent(
  doc: DocumentContent,
  page: DocumentPage,
): ProductionComponent | undefined;
export function menuPages(doc: DocumentContent, format: string): DocumentPage[];
export function addPaperPage(
  doc: DocumentContent,
  options?: {
    componentId?: string;
    name?: string;
    width?: number;
    height?: number;
    format?: string;
  },
): DocumentPage;
export function addCover(doc: DocumentContent, type?: CoverType): DocumentPage;
export function addCoverSurface(
  doc: DocumentContent,
  componentId: string,
  surfaceRole: CoverSurfaceRole,
): DocumentPage;
export function removePage(doc: DocumentContent, pageId: string): void;
export function removeCover(doc: DocumentContent): void;
export function duplicatePage(
  doc: DocumentContent,
  pageId: string,
): DocumentPage;
export function setPageBackground(
  doc: DocumentContent,
  pageId: string,
  background: string,
): void;
export function resizePage(
  doc: DocumentContent,
  pageId: string,
  width: number,
  height: number,
): void;
export function selectExportPages(
  doc: DocumentContent,
  options?: ExportSelection,
): DocumentPage[];
export function productionWarnings(doc: DocumentContent): string[];
export interface DocumentPage {
  componentId?: string;
  surfaceRole?: "front" | "back" | "spine" | "inside-front" | "inside-back";
  id: string;
  name: string;
  width: number;
  height: number;
  bleed: Insets;
  background: string;
  rootIds: string[];
  guides: { x: number[]; y: number[]; safeInset: Insets };
  extensions: Extensions;
}
export interface DocumentContent {
  production?: Production;
  format: "sizzle.document";
  version: 1;
  layoutStatus: "draft" | "ready";
  renderProfile: { id: "sizzle.fixed"; version: "1.0.0" };
  metadata: {
    title: string;
    description: string;
    locale: string;
    tags: string[];
    origin?: { templateId: string; revisionId: string };
  };
  resources: Record<string, Resource>;
  fonts: Record<string, Font>;
  pages: DocumentPage[];
  nodes: Record<string, DocumentNode>;
  extensions: Extensions;
}
export interface HistoryEntry {
  id: string;
  label: string;
  at: string;
  document: DocumentContent;
}
export interface EditorState {
  version: 1;
  activePageId: string;
  selectionIds: string[];
  viewport: { zoom: number; centerX: number; centerY: number };
  panels: {
    activeTab: "content" | "design" | "assets" | "layers" | "history";
    expandedNodeIds: string[];
  };
  guidesVisible: boolean;
  rulersVisible: boolean;
  snapEnabled: boolean;
  history: { past: HistoryEntry[]; future: HistoryEntry[] };
  preview: { label: string; document: DocumentContent } | null;
  extensions: Extensions;
}
export type HistoryPatch =
  | { op: "set"; path: string[]; value: unknown }
  | { op: "delete"; path: string[] };
export interface CompactEditorState extends Omit<
  EditorState,
  "version" | "history"
> {
  version: 2;
  history: {
    baseHash: string;
    past: { id: string; label: string; at: string; patches: HistoryPatch[] }[];
    future: {
      id: string;
      label: string;
      at: string;
      patches: HistoryPatch[];
    }[];
  };
}
export interface SizzleDocument extends DocumentContent {
  editorState?: EditorState | CompactEditorState;
}
export function compactCheckpoint(document: SizzleDocument): SizzleDocument;
export function expandCheckpoint(
  document: SizzleDocument,
): DocumentContent & { editorState?: EditorState };
export type ResourceBytes = Record<string, Uint8Array>;
export const PROFILE: Readonly<{ id: "sizzle.fixed"; version: "1.0.0" }>;
export const POINT_TO_PIXEL: number;
export function validate(value: unknown): asserts value is SizzleDocument;
export function canonical(value: unknown): string;
export function sha256(value: string | Uint8Array): string;
export function identity(x?: number, y?: number): Transform;
export function color(value: string): string;
export function normalizePath(d: string, scale?: number): string;
export function emptyDocument(title?: string): SizzleDocument;
export function contentSnapshot(doc: SizzleDocument): DocumentContent;
export function allContents(doc: SizzleDocument): DocumentContent[];
export function resourceList(doc: SizzleDocument): Resource[];
export function verifyResource(
  resource: Resource,
  bytes: Uint8Array,
): Uint8Array;
export function textInputHash(doc: DocumentContent, node: DocumentNode): string;
export function fontClosure(
  doc: DocumentContent,
  ids: string[],
): Record<string, Font>;
export function transformSVG(transform: Transform): string;
export function dataURL(resource: Resource, bytes: Uint8Array): string;
export function renderPage(
  doc: SizzleDocument,
  pageId: string,
  bytes: ResourceBytes,
  options?: { bleed?: boolean },
): string;
export function editText(
  doc: SizzleDocument,
  nodeId: string,
  text: string,
): SizzleDocument;
