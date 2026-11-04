<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { AppIcon } from "@sizzle/ui";
import PageHeading from "../../restaurant/src/components/PageHeading.vue";
import PageFooter from "../../restaurant/src/components/PageFooter.vue";
import { adminRepository } from "./data";
import { designEditorUrl } from "./editor";
const route = useRoute();
const id = computed(() => String(route.params.id));
const query = useQuery({
  queryKey: computed(() => ["admin", "design-details", id.value]),
  queryFn: ({ signal }) => adminRepository.getDesign(id.value, signal),
});
const design = query.data;
const editorUrl = computed(() => design.value ? designEditorUrl(import.meta.env.VITE_EDITOR_URL, design.value.documentId, window.location.origin) : null);
const date = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
</script>
<template>
  <RouterLink class="back" to="/designs"><AppIcon name="back" />Back to user designs</RouterLink>
  <div v-if="query.isPending.value" class="empty" role="status">Loading design details…</div>
  <div v-else-if="query.isError.value" class="page-error" role="alert">Couldn’t load this design. <button class="btn" @click="query.refetch()">Try again</button></div>
  <template v-else-if="design">
    <PageHeading eyebrow="MADE IN THE CREATIVE KITCHEN" :title="design.name" :description="`${design.id} · ${design.owner.restaurant}`"><span :class="['badge', { orange: design.status === 'Draft', gray: design.status === 'Archived' }]">{{ design.status }}</span></PageHeading>
    <p class="admin-demo-note">Demo design · Details are illustrative.</p>
    <div class="detail-grid admin-record-details">
      <div>
        <section class="panel"><h2>Design overview</h2><p class="admin-description">{{ design.description }}</p><dl class="admin-detail-list"><div><dt>Design ID</dt><dd>{{ design.id }}</dd></div><div><dt>Document ID</dt><dd>{{ design.documentId }}</dd></div><div><dt>Stationery type</dt><dd>{{ design.type }}</dd></div><div><dt>Status</dt><dd>{{ design.status }}</dd></div></dl></section>
        <section class="panel"><h2>Document specifications</h2><dl class="admin-detail-list"><div><dt>Pages</dt><dd>{{ design.pages }}</dd></div><div><dt>Dimensions</dt><dd>{{ design.widthMm }} × {{ design.heightMm }} mm</dd></div><div><dt>Orientation</dt><dd>{{ design.orientation }}</dd></div><div><dt>Version</dt><dd>{{ design.version }}</dd></div></dl></section>
        <section class="panel"><h2>Source template</h2><dl class="admin-detail-list"><div><dt>Template</dt><dd><RouterLink :to="`/templates/${design.template.id}`">{{ design.template.name }}<br /><small>{{ design.template.id }}</small></RouterLink></dd></div></dl><RouterLink class="btn admin-related-link" :to="`/templates/${design.template.id}`">View template details<AppIcon name="arrow" /></RouterLink></section>
      </div>
      <div>
        <section class="panel"><h2>View in editor</h2><p class="admin-description">Open this design in the Sizzle editor in a new tab.</p><a v-if="editorUrl" class="btn primary admin-editor-link" :href="editorUrl" target="_blank" rel="noopener noreferrer">View design in editor<AppIcon name="arrow" /></a><template v-else><button class="btn primary admin-editor-link" disabled aria-describedby="editor-unavailable">View design in editor<AppIcon name="arrow" /></button><p id="editor-unavailable" class="admin-description">The editor is not connected to this workspace yet.</p></template></section>
        <section class="panel"><h2>Design owner</h2><dl class="admin-detail-list"><div><dt>Owner</dt><dd>{{ design.owner.name }}</dd></div><div><dt>User ID</dt><dd>{{ design.owner.id }}</dd></div><div><dt>Email</dt><dd><a :href="`mailto:${design.owner.email}`">{{ design.owner.email }}</a></dd></div><div><dt>Restaurant</dt><dd>{{ design.owner.restaurant }}</dd></div></dl></section>
        <section class="panel"><h2>Activity</h2><dl class="admin-detail-list"><div><dt>Created</dt><dd>{{ date(design.createdAt) }}</dd></div><div><dt>Last updated</dt><dd>{{ date(design.updatedAt) }}</dd></div></dl></section>
      </div>
    </div>
  </template>
  <section v-else class="empty"><h1>Design not found.</h1><p>This design does not exist or is no longer available.</p><RouterLink class="btn" to="/designs">Return to user designs</RouterLink></section>
  <PageFooter />
</template>
