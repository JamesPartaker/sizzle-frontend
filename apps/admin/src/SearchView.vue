<script setup lang="ts">
import { computed } from "vue";
import { AppIcon } from "@sizzle/ui";
import PageHeading from "../../restaurant/src/components/PageHeading.vue";
import PageFooter from "../../restaurant/src/components/PageFooter.vue";
import { statuses, type Kind } from "./data";
import { useAdminSearch } from "./useAdminSearch";
const props = defineProps<{ kind: Kind }>();
const { search, status, limit, sort, page, totalPages, pageNumbers, goTo, query, waiting, next, previous } = useAdminSearch(props.kind);
const titles = { templates: "All templates.", designs: "Every design, one place.", users: "The people behind the menus.", orders: "Keep good things moving." };
const descriptions = { templates: "Find and review templates across the Sizzle library.", designs: "Search designs from every restaurant workspace.", users: "Find a user and keep their account details up to date.", orders: "Find print orders and manage their progress." };
const rows = computed(() => query.data.value?.items || []);
const date = (value: string) => new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const money = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);
</script>
<template>
  <PageHeading eyebrow="THE SIZZLE ADMINISTRATION" :title="titles[kind]" :description="descriptions[kind]" />
  <p class="admin-demo-note">Demo data · Changes last for this session.</p>
  <div class="toolbar admin-toolbar">
    <label class="search"><AppIcon name="search" /><input v-model="search" type="search" :placeholder="`Search ${kind} by name, ID${kind === 'templates' ? ' or type' : ', email or restaurant'}…`" :aria-label="`Search ${kind}`" /></label>
    <select v-model="status" aria-label="Filter by status"><option value="">All statuses</option><option v-for="s in statuses[kind]" :key="s">{{ s }}</option></select>
    <select v-model="sort" aria-label="Sort results"><option value="updated_desc">Recently updated</option><option value="name_asc">Name A–Z</option></select>
    <button v-if="search || status" class="btn" @click="search = ''; status = ''">Clear filters</button>
  </div>
  <div class="admin-results-meta"><span role="status">{{ waiting ? 'Searching…' : `${rows.length} results on this page` }}</span><label>Rows per page <select v-model="limit" aria-label="Rows per page"><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label></div>
  <div v-if="query.error.value" class="page-error" role="alert">Couldn’t load results. <button class="btn" @click="query.refetch()">Try again</button></div>
  <div v-else class="admin-table-wrap" :aria-busy="waiting">
    <table class="admin-table"><caption class="sr-only">{{ kind }} search results</caption><thead><tr>
      <th>{{ kind === 'users' ? 'User' : kind === 'orders' ? 'Order / design' : 'Name' }}</th>
      <th>{{ kind === 'templates' ? 'Stationery' : 'Restaurant / owner' }}</th><th>Status</th><th>{{ kind === 'orders' ? 'Total / quantity' : 'Last updated' }}</th><th><span class="sr-only">Actions</span></th>
    </tr></thead><tbody>
      <tr v-for="row in rows" :key="row.id"><td><div class="admin-record"><span v-if="kind === 'templates' || kind === 'designs'" :class="['admin-thumb', { lavender: row.type === 'Drinks menu' }]"><AppIcon :name="kind === 'templates' ? 'grid' : 'file'" /></span><div><strong>{{ row.name }}</strong><small>{{ kind === 'users' ? row.email : row.id }}</small></div></div></td>
        <td><template v-if="kind === 'templates'">{{ row.type }}</template><template v-else><strong>{{ row.restaurant }}</strong><small>{{ row.email }}</small></template></td>
        <td><span :class="['badge', { orange: ['Pending', 'In production', 'Invited', 'Draft'].includes(row.status), gray: ['Archived', 'Cancelled', 'Suspended'].includes(row.status) }]">{{ row.status }}</span></td>
        <td><template v-if="kind === 'orders'"><strong>{{ money(row.total) }} CAD</strong><small>{{ row.quantity }} copies · {{ date(row.updatedAt) }}</small></template><template v-else>{{ date(row.updatedAt) }}</template></td>
        <td>
          <RouterLink v-if="kind === 'orders'" class="btn admin-edit" :to="`/orders/${row.id}`" :aria-label="`View order ${row.id}`">View order<AppIcon name="chevron" /></RouterLink>
          <RouterLink v-else-if="kind === 'templates' || kind === 'designs'" class="btn admin-edit" :to="`/${kind}/${row.id}`" :aria-label="`View ${kind === 'templates' ? 'template' : 'design'} ${row.id}`">View details<AppIcon name="chevron" /></RouterLink>
          <RouterLink v-else class="btn admin-edit" :to="`/users/${row.id}`" :aria-label="`View user ${row.id}`">View user<AppIcon name="chevron" /></RouterLink>
        </td>
      </tr>
      <tr v-if="!rows.length"><td colspan="5" class="empty">{{ waiting ? 'Loading results…' : 'No matching records. Try another search or clear your filters.' }}</td></tr>
    </tbody></table>
  </div>
  <nav class="admin-pagination" aria-label="Results pagination">
    <span class="sr-only" role="status">Page {{ page + 1 }}</span>
    <button class="btn" :disabled="page === 0 || waiting || query.isError.value" @click="previous">Prev</button>
    <template v-for="(number, index) in pageNumbers" :key="`${index}-${number}`">
      <span v-if="number === 'ellipsis'" class="pagination-ellipsis" aria-hidden="true">…</span>
      <button v-else :class="['btn', { 'current-page': number === page + 1 }]" :aria-label="`Go to page ${number}`" :aria-current="number === page + 1 ? 'page' : undefined" :disabled="waiting || query.isError.value" @click="goTo(number)">{{ number }}</button>
    </template>
    <button class="btn" :disabled="page + 1 >= totalPages || waiting || query.isError.value" @click="next">Next</button>
  </nav>
  <PageFooter />
</template>
