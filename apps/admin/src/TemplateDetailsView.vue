<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { AppIcon } from "@sizzle/ui";
import PageHeading from "../../restaurant/src/components/PageHeading.vue";
import PageFooter from "../../restaurant/src/components/PageFooter.vue";
import { adminRepository } from "./data";
const route = useRoute();
const id = computed(() => String(route.params.id));
const query = useQuery({
  queryKey: computed(() => ["admin", "template-details", id.value]),
  queryFn: ({ signal }) => adminRepository.getTemplate(id.value, signal),
});
const template = query.data;
const date = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
</script>
<template>
  <RouterLink class="back" to="/templates"><AppIcon name="back" />Back to all templates</RouterLink>
  <div v-if="query.isPending.value" class="empty" role="status">Loading template details…</div>
  <div v-else-if="query.isError.value" class="page-error" role="alert">Couldn’t load this template. <button class="btn" @click="query.refetch()">Try again</button></div>
  <template v-else-if="template">
    <PageHeading eyebrow="THE SIZZLE LIBRARY" :title="template.name" :description="`${template.id} · ${template.type}`"><span :class="['badge', { orange: template.status === 'Draft', gray: template.status === 'Archived' }]">{{ template.status }}</span></PageHeading>
    <p class="admin-demo-note">Demo template · Details are illustrative.</p>
    <div class="detail-grid admin-record-details">
      <div>
        <section class="panel"><h2>Template overview</h2><p class="admin-description">{{ template.description }}</p><dl class="admin-detail-list"><div><dt>Template ID</dt><dd>{{ template.id }}</dd></div><div><dt>Stationery type</dt><dd>{{ template.type }}</dd></div><div><dt>Style</dt><dd>{{ template.style }}</dd></div><div><dt>Colour palette</dt><dd>{{ template.palette }}</dd></div></dl><div class="admin-detail-tags" aria-label="Template tags"><span v-for="tag in template.tags" :key="tag" class="chip">{{ tag }}</span></div></section>
        <section class="panel"><h2>Document specifications</h2><dl class="admin-detail-list"><div><dt>Pages</dt><dd>{{ template.pages }}</dd></div><div><dt>Dimensions</dt><dd>{{ template.widthMm }} × {{ template.heightMm }} mm</dd></div><div><dt>Orientation</dt><dd>{{ template.orientation }}</dd></div><div><dt>Print bleed</dt><dd>{{ template.bleedMm }} mm</dd></div><div><dt>Fonts</dt><dd>{{ template.fonts.join(', ') }}</dd></div></dl></section>
      </div>
      <div>
        <section class="panel"><h2>Publication details</h2><dl class="admin-detail-list"><div><dt>Status</dt><dd>{{ template.status }}</dd></div><div><dt>Created by</dt><dd>{{ template.author }}</dd></div><div><dt>Created</dt><dd>{{ date(template.createdAt) }}</dd></div><div><dt>Last updated</dt><dd>{{ date(template.updatedAt) }}</dd></div><div><dt>Version</dt><dd>{{ template.version }}</dd></div></dl></section>
        <section class="panel"><h2>Template usage</h2><dl class="admin-detail-list"><div><dt>Designs created</dt><dd>{{ template.usageCount.toLocaleString() }}</dd></div></dl></section>
      </div>
    </div>
  </template>
  <section v-else class="empty"><h1>Template not found.</h1><p>This template does not exist or is no longer available.</p><RouterLink class="btn" to="/templates">Return to all templates</RouterLink></section>
  <PageFooter />
</template>
