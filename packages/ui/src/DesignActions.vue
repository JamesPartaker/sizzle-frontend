<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "reka-ui";
import AppIcon from "./AppIcon.vue";
defineProps<{ name: string }>();
const emit = defineEmits<{ rename: []; duplicate: []; delete: [] }>();
</script>
<template>
  <DropdownMenuRoot
    ><DropdownMenuTrigger class="dots" :aria-label="`Options for ${name}`"
      ><AppIcon name="more"
    /></DropdownMenuTrigger>
    <DropdownMenuPortal
      ><DropdownMenuContent
        class="popover action-popover"
        align="end"
        :side-offset="6"
      >
        <DropdownMenuItem @select="emit('rename')"
          ><AppIcon name="edit" />Rename design</DropdownMenuItem
        >
        <DropdownMenuItem @select="emit('duplicate')"
          ><AppIcon name="copy" />Duplicate design</DropdownMenuItem
        >
        <DropdownMenuItem class="danger" @select="emit('delete')"
          ><AppIcon name="trash" />Delete design</DropdownMenuItem
        >
      </DropdownMenuContent></DropdownMenuPortal
    >
  </DropdownMenuRoot>
</template>
