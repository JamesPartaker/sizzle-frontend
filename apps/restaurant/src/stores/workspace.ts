import { defineStore } from "pinia";
import { ref } from "vue";
import type { Design, Template } from "@sizzle/schemas";
import { isDemo } from "../api";
import { authApi } from "../auth";
export const useWorkspaceStore = defineStore("workspace", () => {
  const session = ref(isDemo ? {
    name: "Jamie Laurent", initials: "JL", restaurant: "Sunday Table",
  } : { name: "", initials: "", restaurant: "" });
  async function loadProfile() {
    const profile = await authApi.me();
    const name = profile.Name || profile.EmailAddress;
    session.value = {
      name, restaurant: profile.Restaurant,
      initials: name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase(),
    };
    return profile;
  }
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
    loadProfile,
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
