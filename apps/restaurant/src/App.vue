<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { AppIcon } from "@sizzle/ui";
import { useWorkspaceData } from "./composables/useWorkspaceData";
import { useWorkspaceStore } from "./stores/workspace";
import { isDemo } from "./api";
import WorkspaceDialogs from "./components/WorkspaceDialogs.vue";
const route = useRoute();
const ui = useWorkspaceStore();
const { designs, restore } = useWorkspaceData();
const navs = [
  { id: "dashboard", icon: "home", label: "Overview" },
  { id: "designs", icon: "file", label: "My designs" },
  { id: "templates", icon: "grid", label: "Templates" },
  { id: "assets", icon: "image", label: "My assets" },
  { id: "orders", icon: "box", label: "Print orders" },
];
const current = computed(() =>
  route.path.startsWith("/orders") ? "orders" : String(route.name),
);
watch(
  () => route.fullPath,
  () => {
    ui.mobileOpen = false;
  },
);
function undo() {
  if (!ui.lastDeleted) return;
  restore.mutate(ui.lastDeleted, {
    onSuccess: () => {
      ui.lastDeleted = null;
      ui.notify("Design restored.");
    },
  });
}
</script>
<template>
  <a class="sr-only focus:not-sr-only" href="#content">Skip to content</a>
  <button
    v-if="ui.mobileOpen"
    class="mobile-nav-shade"
    aria-label="Close navigation"
    @click="ui.mobileOpen = false"
  />
  <aside :class="['sidebar', { 'mobile-open': ui.mobileOpen }]">
    <RouterLink class="brand" to="/dashboard" aria-label="Sizzle home"
      ><img src="/assets/sizzle-logo.svg" alt="SIZZLE" /><small
        >YOUR CREATIVE KITCHEN</small
      ></RouterLink
    >
    <div class="workspace">
      <div class="restaurant-avatar">S</div>
      <div>
        <strong>{{ ui.session.restaurant }}</strong
        ><small>Restaurant workspace</small>
      </div>
    </div>
    <div class="nav-label">YOUR WORKSPACE</div>
    <nav class="nav" aria-label="Workspace">
      <RouterLink
        v-for="item in navs"
        :key="item.id"
        :to="`/${item.id}`"
        :class="{ active: current === item.id }"
        :aria-current="current === item.id ? 'page' : undefined"
        ><AppIcon :name="item.icon" /><span class="nav-text">{{
          item.label
        }}</span
        ><span v-if="item.id === 'designs'" class="count">{{
          designs.data.value?.length || 0
        }}</span></RouterLink
      >
    </nav>
    <div class="sidebar-bottom">
      <div class="help-card">
        <strong>A little help?</strong>
        <p>Good design starts with<br />a good conversation.</p>
        <button @click="ui.helpOpen = true">
          Visit the help kitchen <AppIcon name="arrow" />
        </button>
      </div>
      <div class="profile">
        <div class="avatar">{{ ui.session.initials }}</div>
        <div>
          <strong>{{ ui.session.name }}</strong
          ><small>Restaurant owner</small>
        </div>
      </div>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <button
        class="menu-toggle"
        aria-label="Open navigation"
        :aria-expanded="ui.mobileOpen"
        @click="ui.mobileOpen = !ui.mobileOpen"
      >
        <AppIcon name="menu" /></button
      ><img class="mobile-logo" src="/assets/sizzle-logo.svg" alt="Sizzle" />
      <div class="crumb">
        Workspace <span>/ &nbsp; {{ route.meta.title }}</span>
      </div>
      <div class="top-right">
        <span v-if="isDemo" class="demo">Demo workspace</span
        ><button
          aria-label="Notifications"
          @click="ui.notificationsOpen = true"
        >
          <AppIcon name="bell" />
        </button>
        <div class="avatar">{{ ui.session.initials }}</div>
      </div>
    </header>
    <main id="content" class="content"><RouterView /></main>
  </div>
  <WorkspaceDialogs />
  <div id="toast" role="status" :class="{ show: ui.toast }">
    {{ ui.toast
    }}<button
      v-if="ui.lastDeleted && ui.toast === 'Design deleted.'"
      class="inline-undo"
      :disabled="restore.isPending.value"
      @click="undo"
    >
      Undo
    </button>
  </div>
</template>
