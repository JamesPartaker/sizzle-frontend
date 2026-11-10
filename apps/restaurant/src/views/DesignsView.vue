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
const { ui, data, openDesign, duplicate, addToOrder } = useDesignActions();
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
    <div class="rows designs-list">
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
            <img v-if="row.original.thumbnailUrl" :src="row.original.thumbnailUrl" :alt="`${row.original.name} preview`" style="width:100%;height:100%;object-fit:contain" loading="lazy" />
            <MenuPreview
              v-else-if="template(row.original.template)"
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
          <button class="btn primary" @click="addToOrder(row.original)">Add to order <AppIcon name="plus" /></button>
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
<style scoped>
.designs-list .table-head,
.designs-list .doc-row {
  grid-template-columns: minmax(180px, 1fr) 100px 110px 320px;
}
.designs-list .row-actions {
  align-items: center;
  gap: 8px;
}
.designs-list .row-actions .btn {
  flex-shrink: 0;
}
@media (max-width: 1280px) {
  .designs-list .table-head {
    display: none;
  }
  .designs-list .doc-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .designs-list .doc-name {
    grid-column: 1 / -1;
    width: auto;
  }
  .designs-list .doctype {
    display: none;
  }
  .designs-list .doc-row > .muted {
    margin-left: 73px;
  }
}
@media (max-width: 600px) {
  .designs-list .doc-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .designs-list .doc-row > .muted {
    margin-left: 67px;
  }
  .designs-list .row-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    width: 100%;
  }
  .designs-list .row-actions .btn {
    justify-content: center;
    white-space: normal;
  }
}
</style>
