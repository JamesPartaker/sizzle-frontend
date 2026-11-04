<script setup lang="ts">
import { computed, ref } from "vue";
import { useDropZone } from "@vueuse/core";
import { AppIcon } from "@sizzle/ui";
import { validateUpload } from "@sizzle/utils";
import { useWorkspaceData } from "../composables/useWorkspaceData";
import { useWorkspaceStore } from "../stores/workspace";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
const { assets, upload } = useWorkspaceData();
const ui = useWorkspaceStore();
const search = ref(""),
  type = ref("All assets");
const input = ref<HTMLInputElement>(),
  dropZone = ref<HTMLElement>();
const uploading = ref(false);
const { isOverDropZone } = useDropZone(dropZone, {
  onDrop: (files) => {
    if (files) void addFiles(files);
  },
});
const filtered = computed(() =>
  (assets.data.value || []).filter(
    (a) =>
      (type.value === "All assets" || a.type === type.value) &&
      a.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
async function addFiles(files: File[] | FileList) {
  if (uploading.value) return;
  uploading.value = true;
  let count = 0;
  for (const file of Array.from(files)) {
    const error = validateUpload(file);
    if (error) {
      ui.notify(error);
      continue;
    }
    try {
      await upload.mutateAsync(file);
      count++;
    } catch {
      break;
    }
  }
  if (count)
    ui.notify(
      `${count} ${count === 1 ? "asset" : "assets"} added to your creative kitchen.`,
    );
  if (input.value) input.value.value = "";
  uploading.value = false;
}
function choose(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) void addFiles(files);
}
</script>
<template>
  <PageHeading
    eyebrow="YOUR BRAND, AT HAND"
    title="All the little details."
    description="Your logos, images, and fonts. Ready for their next menu."
    ><button
      class="btn primary"
      :disabled="uploading"
      @click="input?.click()"
    >
      <AppIcon name="upload" />Upload assets
    </button></PageHeading
  >
  <input
    ref="input"
    type="file"
    hidden
    accept=".png,.jpg,.jpeg,.gif,.ttf,.otf"
    multiple
    @change="choose"
  />
  <div
    ref="dropZone"
    :class="['upload-zone', { dragging: isOverDropZone }]"
    tabindex="0"
    role="button"
    aria-label="Upload assets"
    :aria-disabled="uploading"
    @click="input?.click()"
    @keydown.enter="input?.click()"
    @keydown.space.prevent="input?.click()"
  >
    <AppIcon name="upload" /><strong>Drop something good here.</strong>
    <p>
      Drag & drop or <u>browse files</u> &nbsp; · &nbsp; PNG, JPG, GIF, TTF, OTF
      &nbsp; · &nbsp; Up to 20 MB each
    </p>
  </div>
  <div class="toolbar">
    <label class="search"
      ><AppIcon name="search" /><input
        v-model="search"
        type="search"
        placeholder="Search your assets…"
        aria-label="Search your assets…"
    /></label>
  </div>
  <div class="chips">
    <button
      v-for="t in [
        'All assets',
        'Logos',
        'Illustrations',
        'Images',
        'Fonts',
        'Brand colours',
      ]"
      :key="t"
      :class="['chip', { active: type === t }]"
      :aria-pressed="type === t"
      @click="type = t"
    >
      {{ t }}
    </button>
  </div>
  <QueryState
    :loading="assets.isPending.value"
    :error="assets.error.value"
    @retry="assets.refetch()"
    ><div class="results-meta">
      {{ filtered.length }} assets &nbsp; · &nbsp; Everything your brand needs,
      in one place
    </div>
    <div class="asset-grid">
      <article v-for="asset in filtered" :key="asset.id" class="asset-card">
        <div class="asset-image">
          <img v-if="asset.data" :src="asset.data" :alt="asset.name" />
          <AppIcon v-else-if="asset.type === 'Fonts'" name="file" />
          <div v-else-if="asset.id === 'logo'" class="asset-logo">
            Sunday<br />Table<br /><small>GOOD THINGS, MADE SLOWLY.</small>
          </div>
          <img
            v-else-if="asset.id === 'olive'"
            src="/assets/olive-sprig.svg"
            alt="Olive branch illustration"
          /><img
            v-else-if="asset.id === 'wordmark'"
            src="/assets/sizzle-logo.svg"
            alt="Sizzle wordmark"
          />
          <div v-else class="flex gap-1.5">
            <i
              v-for="color in ['#c05a3a', '#fff9e9', '#965a3b', '#751a40']"
              :key="color"
              class="brand-swatch"
              :style="{ background: color }"
            />
          </div>
        </div>
        <div class="design-info">
          <strong>{{ asset.name }}</strong>
          <p>{{ asset.size }}</p>
        </div>
      </article>
      <div v-if="!filtered.length" class="empty">
        No assets found. Try a different search or upload a file.
      </div>
    </div></QueryState
  ><PageFooter />
</template>
