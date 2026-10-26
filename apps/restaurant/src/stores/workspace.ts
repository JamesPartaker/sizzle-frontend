import { defineStore } from "pinia";
import { ref } from "vue";
import type { Design, Template } from "@sizzle/schemas";
import { useStorage } from "@vueuse/core";
export const useWorkspaceStore = defineStore("workspace", () => {
  const session = useStorage("sizzle-session", {
    name: "Jamie Laurent",
    initials: "JL",
    restaurant: "Sunday Table",
  });
  const mobileOpen = ref(false);
  const toast = ref("");
  const previewDesign = ref<Design | null>(null);
  const previewTemplate = ref<Template | null>(null);
  const renameDesign = ref<Design | null>(null);
  const deleteDesign = ref<Design | null>(null);
  const lastDeleted = ref<Design | null>(null);
  const helpOpen = ref(false);
  const notificationsOpen = ref(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function notify(message: string) {
    toast.value = message;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      toast.value = "";
    }, 4500);
  }
  return {
    session,
    mobileOpen,
    toast,
    notify,
    previewDesign,
    previewTemplate,
    renameDesign,
    deleteDesign,
    lastDeleted,
    helpOpen,
    notificationsOpen,
  };
});
