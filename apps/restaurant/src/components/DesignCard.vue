<script setup lang="ts">
import { AppIcon, MenuPreview, DesignActions } from "@sizzle/ui";
import { previewColors, timeAgo } from "@sizzle/utils";
import type { Design, Template } from "@sizzle/schemas";
import { useDesignActions } from "../composables/useDesignActions";
defineProps<{ design: Design; template?: Template }>();
const { ui, openDesign, duplicate } = useDesignActions();
</script>
<template>
  <article class="design-card">
    <button
      class="design-preview design-preview-trigger"
      :aria-label="`Open ${design.name} in editor`"
      :style="{ background: previewColors[design.template] || '#ffe1d2' }"
      @click="openDesign(design)"
    >
      <MenuPreview
        v-if="template"
        :template="template"
        :title="design.menuTitle"
      /><span class="edit-overlay btn"
        >Open in editor <AppIcon name="arrow"
      /></span>
    </button>
    <div class="design-info">
      <div>
        <strong>{{ design.name }}</strong
        ><span class="status">{{ design.status }}</span>
        <p>
          Edited {{ timeAgo(design.edited) }} &nbsp; · &nbsp; {{ design.pages }}
          {{ design.pages === 1 ? "page" : "pages" }}
        </p>
      </div>
      <DesignActions
        :name="design.name"
        @rename="ui.renameDesign = design"
        @duplicate="duplicate(design)"
        @delete="ui.deleteDesign = design"
      />
    </div>
  </article>
</template>
