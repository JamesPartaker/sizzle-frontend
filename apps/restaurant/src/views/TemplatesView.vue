<script setup lang="ts">
import { computed, reactive } from "vue";
import type { TemplateFilters } from "@sizzle/schemas";
import { AppIcon } from "@sizzle/ui";
import { useWorkspaceData } from "../composables/useWorkspaceData";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import TemplateCard from "../components/TemplateCard.vue";
import QueryState from "../components/QueryState.vue";
const { templates } = useWorkspaceData();
const filters = reactive<TemplateFilters>({
  q: "",
  style: "All styles",
  type: "All stationery",
  color: "All palettes",
});
const styles = computed(() => [
  "All styles",
  ...new Set(templates.data.value?.map((t) => t.style)),
]);
const types = computed(() => [
  "All stationery",
  ...new Set(templates.data.value?.map((t) => t.type)),
]);
const filtered = computed(() =>
  (templates.data.value || []).filter(
    (t) =>
      `${t.name} ${t.style} ${t.type} ${t.tag}`
        .toLowerCase()
        .includes(filters.q.toLowerCase()) &&
      (filters.style === "All styles" || t.style === filters.style) &&
      (filters.type === "All stationery" || t.type === filters.type) &&
      (filters.color === "All palettes" || t.color === filters.color),
  ),
);
function reset() {
  Object.assign(filters, {
    q: "",
    style: "All styles",
    type: "All stationery",
    color: "All palettes",
  });
}
</script>
<template>
  <PageHeading
    eyebrow="FIND YOUR FLAVOUR"
    title="A good place to start."
    description="Your food has personality. Find a template to match."
  />
  <div class="library">
    <div class="toolbar">
      <label class="search"
        ><AppIcon name="search" /><input
          v-model="filters.q"
          type="search"
          placeholder="Search templates…"
          aria-label="Search templates…" /></label
      ><select v-model="filters.style" aria-label="Restaurant style">
        <option v-for="style in styles" :key="style">
          {{ style }}
        </option></select
      ><select v-model="filters.type" aria-label="Stationery type">
        <option v-for="type in types" :key="type">{{ type }}</option></select
      ><select v-model="filters.color" aria-label="Colour palette">
        <option>All palettes</option>
        <option>Warm</option>
        <option>Cool</option>
      </select>
    </div>
    <div class="chips">
      <button
        v-for="style in [
          'All tastes',
          'Elegant dining',
          'Coffee shop',
          'Cocktail bar',
          'Sandwich shop',
          'Vietnamese',
          'Burger joint',
        ]"
        :key="style"
        :class="[
          'chip',
          {
            active:
              (style === 'All tastes' && filters.style === 'All styles') ||
              style === filters.style,
          },
        ]"
        :aria-pressed="
          (style === 'All tastes' && filters.style === 'All styles') ||
          style === filters.style
        "
        @click="filters.style = style === 'All tastes' ? 'All styles' : style"
      >
        {{ style }}
      </button>
    </div>
    <QueryState
      :loading="templates.isPending.value"
      :error="templates.error.value"
      @retry="templates.refetch()"
      ><div class="results-meta">
        {{ filtered.length }} thoughtfully designed
        {{ filtered.length === 1 ? "template" : "templates" }} &nbsp; · &nbsp;
        All included with your workspace
      </div>
      <div class="template-grid">
        <TemplateCard v-for="t in filtered" :key="t.id" :template="t" />
        <div v-if="!filtered.length" class="empty">
          No templates found. Try another search or reset your filters.<br /><br /><button
            class="btn"
            @click="reset"
          >
            Reset filters
          </button>
        </div>
      </div></QueryState
    >
  </div>
  <PageFooter />
</template>
