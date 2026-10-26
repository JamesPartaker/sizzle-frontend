<script setup lang="ts">
import { computed, ref } from "vue";
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/vue-table";
import type { ColumnDef, SortingState } from "@tanstack/vue-table";
import type { Design } from "@sizzle/schemas";
import { AppIcon, MenuPreview, DesignActions } from "@sizzle/ui";
import { timeAgo } from "@sizzle/utils";
import { useDesignActions } from "../composables/useDesignActions";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
const { ui, data, openDesign, duplicate } = useDesignActions();
const search = ref("");
const sort = ref("newest");
const sorting = computed<SortingState>(() => [
  {
    id: sort.value === "name" ? "name" : "edited",
    desc: sort.value !== "name",
  },
]);
const columns: ColumnDef<Design>[] = [
  { accessorKey: "name", enableGlobalFilter: true },
  { accessorKey: "edited", enableGlobalFilter: false },
];
const table = useVueTable({
  get data() {
    return data.designs.data.value || [];
  },
  columns,
  state: {
    get sorting() {
      return sorting.value;
    },
    get globalFilter() {
      return search.value;
    },
  },
  globalFilterFn: "includesString",
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});
const template = (id: string) =>
  data.templates.data.value?.find((t) => t.id === id);
</script>
<template>
  <PageHeading
    eyebrow="MADE BY YOU"
    title="Your designs. All together."
    description="From the first draft to the next seasonal favourite."
    ><RouterLink class="btn primary" to="/templates"
      ><AppIcon name="plus" />New design</RouterLink
    ></PageHeading
  >
  <div class="toolbar">
    <label class="search"
      ><AppIcon name="search" /><input
        v-model="search"
        type="search"
        placeholder="Search your designs…"
        aria-label="Search your designs…" /></label
    ><select v-model="sort" aria-label="Sort designs">
      <option value="newest">Last edited: newest first</option>
      <option value="name">Name: A–Z</option>
    </select>
  </div>
  <QueryState
    :loading="data.designs.isPending.value"
    :error="data.designs.error.value"
    @retry="data.designs.refetch()"
    ><div class="results-meta">
      {{ table.getRowModel().rows.length }} designs in your workspace
    </div>
    <div class="rows">
      <div class="table-head">
        <span>Design name</span><span>Stationery</span><span>Last edited</span
        ><span class="text-right">Actions</span>
      </div>
      <article
        v-for="row in table.getRowModel().rows"
        :key="row.id"
        class="doc-row"
      >
        <div class="doc-name">
          <div class="doc-thumb">
            <MenuPreview
              v-if="template(row.original.template)"
              :template="template(row.original.template)!"
              :title="row.original.menuTitle"
            />
          </div>
          <div>
            <strong>{{ row.original.name }}</strong
            ><small
              >{{ row.original.pages }}
              {{ row.original.pages === 1 ? "page" : "pages" }} &nbsp; · &nbsp;
              A4 portrait &nbsp; · &nbsp; {{ row.original.status }}</small
            >
          </div>
        </div>
        <div class="doctype muted">{{ row.original.type }}</div>
        <div class="muted">{{ timeAgo(row.original.edited) }}</div>
        <div class="row-actions">
          <button class="btn" @click="openDesign(row.original)">
            Open in editor <AppIcon name="arrow" /></button
          ><DesignActions
            :name="row.original.name"
            @rename="ui.renameDesign = row.original"
            @duplicate="duplicate(row.original)"
            @delete="ui.deleteDesign = row.original"
          />
        </div>
      </article>
      <div v-if="!table.getRowModel().rows.length" class="empty">
        No designs found. Start with a template or try a different search.
      </div>
    </div></QueryState
  ><PageFooter />
</template>
