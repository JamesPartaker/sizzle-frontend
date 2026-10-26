<script setup lang="ts">
import {
  House,
  LayoutGrid,
  FileText,
  Image,
  Package,
  ArrowRight,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Bell,
  CircleHelp,
  Copy,
  Pencil,
  Trash2,
  Upload,
  Check,
  ArrowLeft,
  Sparkles,
  Menu,
  X,
  MoreHorizontal,
} from "lucide-vue-next";
const props = defineProps<{ name: string }>();
const icons = {
  home: House,
  grid: LayoutGrid,
  file: FileText,
  image: Image,
  box: Package,
  arrow: ArrowRight,
  plus: Plus,
  search: Search,
  chevron: ChevronRight,
  down: ChevronDown,
  bell: Bell,
  help: CircleHelp,
  copy: Copy,
  edit: Pencil,
  trash: Trash2,
  upload: Upload,
  check: Check,
  back: ArrowLeft,
  spark: Sparkles,
  menu: Menu,
  close: X,
  more: MoreHorizontal,
};
</script>
<template>
  <component
    :is="icons[props.name as keyof typeof icons] || FileText"
    :size="19"
    :stroke-width="1.6"
    aria-hidden="true"
  />
</template>
