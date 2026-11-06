export const apiOrigin = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:1323" : window.location.origin);
export const editorOrigin = import.meta.env.VITE_EDITOR_URL || (import.meta.env.DEV ? "http://localhost:1234" : "/editor/");
