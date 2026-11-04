<script setup lang="ts">
import { computed } from "vue";
import type { Template } from "@sizzle/schemas";
const props = defineProps<{ template: Template; title?: string }>();
const heading = computed(() => props.title || props.template.title.split("<br>").join("\n"));
</script>
<template>
  <img v-if="template.thumbnailUrl" class="document-thumbnail" :src="template.thumbnailUrl" :alt="`${template.name} preview`" loading="lazy" />
  <div
    v-else
    :class="['mini-menu', template.id]"
    :aria-label="`${template.name} menu preview`"
  >
    <div class="kicker">{{ template.kicker }}</div>
    <div class="menu-title">
      {{ heading }}
    </div>
    <div class="tagline">{{ template.sub }}</div>
    <div class="menu-section">{{ template.section }}</div>
    <div v-for="item in template.items" :key="item[0]" class="menu-item">
      <b
        >{{ item[0] }}<span>{{ item[1] }}</span></b
      ><small>{{ item[2] }}</small>
    </div>
    <div class="menu-footer">{{ template.footer }}</div>
  </div>
</template>
<style scoped>.document-thumbnail{display:block;width:100%;height:100%;object-fit:contain}</style>
