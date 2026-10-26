<script setup lang="ts">
import { AppIcon, MenuPreview } from "@sizzle/ui";
import { previewColors } from "@sizzle/utils";
import type { Template } from "@sizzle/schemas";
import { useDesignActions } from "../composables/useDesignActions";
defineProps<{ template: Template }>();
const { ui, data, useTemplate } = useDesignActions();
</script>
<template>
  <article class="template-card">
    <button
      class="template-preview"
      :aria-label="`Preview ${template.name}`"
      :style="{ background: previewColors[template.id] }"
      @click="ui.previewTemplate = template"
    >
      <MenuPreview :template="template" />
    </button>
    <div class="template-name">
      <strong>{{ template.name }}</strong
      ><span class="muted">↗</span>
    </div>
    <p>{{ template.style }} &nbsp; · &nbsp; {{ template.type }}</p>
    <button
      class="btn"
      :disabled="data.create.isPending.value"
      @click="useTemplate(template)"
    >
      Use this template <AppIcon name="arrow" />
    </button>
  </article>
</template>
