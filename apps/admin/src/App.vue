<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { AppIcon } from "@sizzle/ui";
const route = useRoute();
const mobileOpen = ref(false);
const navs = [
  { id: "templates", label: "All templates", icon: "grid" },
  { id: "designs", label: "User designs", icon: "file" },
  { id: "users", label: "All users", icon: "home" },
  { id: "orders", label: "All orders", icon: "box" },
];
watch(() => route.fullPath, () => { mobileOpen.value = false; });
</script>
<template>
  <a class="skip-link" href="#content">Skip to content</a>
  <button v-if="mobileOpen" class="mobile-nav-shade" aria-label="Close navigation" @click="mobileOpen = false" />
  <aside :class="['sidebar', { 'mobile-open': mobileOpen }]">
    <RouterLink class="brand" to="/templates" aria-label="Sizzle administrator home"><img src="/assets/sizzle-logo.svg" alt="SIZZLE" /><small>YOUR CREATIVE KITCHEN</small></RouterLink>
    <div class="workspace"><div class="restaurant-avatar">S</div><div><strong>Sizzle Studio</strong><small>Administrator workspace</small></div></div>
    <div class="nav-label">ADMINISTRATION</div>
    <nav class="nav" aria-label="Administration"><RouterLink v-for="item in navs" :key="item.id" :to="`/${item.id}`" :class="{ active: (route.name === item.id || (item.id === 'orders' && route.name === 'order-details')) }" :aria-current="(route.name === item.id || (item.id === 'orders' && route.name === 'order-details')) ? 'page' : undefined" :aria-label="item.label"><AppIcon :name="item.icon" /><span class="nav-text">{{ item.label }}</span></RouterLink></nav>
    <div class="sidebar-bottom"><div class="profile"><div class="avatar">SA</div><div><strong>Sizzle administrator</strong><small>Demo session</small></div></div></div>
  </aside>
  <div class="main"><header class="topbar"><button class="menu-toggle" aria-label="Open navigation" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen"><AppIcon name="menu" /></button><img class="mobile-logo" src="/assets/sizzle-logo.svg" alt="Sizzle" /><div class="crumb">Administration <span>/ &nbsp; {{ navs.find(n => n.id === (route.name === 'order-details' ? 'orders' : route.name))?.label || 'Page not found' }}</span></div><div class="top-right"><span class="demo">Demo workspace</span><div class="avatar">SA</div></div></header><main id="content" class="content"><RouterView :key="String(route.name)" /></main></div>
</template>
