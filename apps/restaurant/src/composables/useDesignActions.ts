import { useRouter } from "vue-router";
import type { Design, Template } from "@sizzle/schemas";
import { useWorkspaceStore } from "../stores/workspace";
import { useWorkspaceData } from "./useWorkspaceData";
export function useDesignActions() {
  const ui = useWorkspaceStore();
  const data = useWorkspaceData();
  const router = useRouter();
  function openDesign(design: Design) {
    if (import.meta.env.VITE_EDITOR_URL) {
      const url = new URL(
        import.meta.env.VITE_EDITOR_URL,
        window.location.origin,
      );
      url.searchParams.set("documentId", design.id);
      window.location.assign(url.href);
    } else ui.previewDesign = design;
  }
  async function useTemplate(template: Template) {
    try {
      const design = await data.create.mutateAsync({
        name: `${template.name} — new design`,
        template: template.id,
        type: template.type,
        pages: 1,
        status: "Draft",
      });
      ui.previewTemplate = null;
      await router.push("/designs");
      openDesign(design);
      ui.notify("Your new design is ready to make your own.");
    } catch {
      /* Query mutations display the error, leaving the dialog open for retry. */
    }
  }
  function duplicate(design: Design) {
    data.duplicate.mutate(design.id);
  }
  return { ui, data, openDesign, useTemplate, duplicate };
}
