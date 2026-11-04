<script setup lang="ts">
import { useRoute } from "vue-router";
import WorkspaceLayout from "./components/WorkspaceLayout.vue";
const route = useRoute();
</script>
<template>
  <RouterView v-if="route.meta.authPage" />
  <WorkspaceLayout v-else />
</template>
