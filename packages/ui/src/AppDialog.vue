<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "reka-ui";
import AppIcon from "./AppIcon.vue";
defineProps<{
  open: boolean;
  title: string;
  description?: string;
  large?: boolean;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();
</script>
<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal
      ><DialogOverlay class="modal-shade" /><DialogContent
        :class="[
          'modal',
          'dialog-content',
          { 'editor-modal design-preview-modal': large },
        ]"
      >
        <DialogClose class="close" aria-label="Close dialog"
          ><AppIcon name="close"
        /></DialogClose>
        <slot name="eyebrow" /><DialogTitle as="h2">{{ title }}</DialogTitle>
        <DialogDescription
          v-if="description"
          as="p"
          class="preview-description"
          >{{ description }}</DialogDescription
        >
        <DialogDescription v-else class="sr-only">{{
          title
        }}</DialogDescription>
        <slot /> </DialogContent
    ></DialogPortal>
  </DialogRoot>
</template>
