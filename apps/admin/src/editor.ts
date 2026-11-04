/** Same documentId handoff as the restaurant workspace; no document is fetched here. */
export function designEditorUrl(base: string | undefined, documentId: string, origin: string): string | null {
  if (!base?.trim()) return null;
  try {
    const url = new URL(base, origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.searchParams.set("documentId", documentId);
    return url.href;
  } catch {
    return null;
  }
}
