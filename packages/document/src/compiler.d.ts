import type { SizzleDocument, ResourceBytes } from "./index.js";
export function compileDocument(
  document: SizzleDocument,
  resourceBytes: ResourceBytes,
): SizzleDocument;
export function inspectFont(bytes: Uint8Array): {
  family: string;
  weight: number;
  italic: boolean;
  axes: Record<string, { min: number; max: number; default: number }>;
};
