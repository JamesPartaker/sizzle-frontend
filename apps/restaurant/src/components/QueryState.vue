<script setup lang="ts">
defineProps<{ loading: boolean; error: Error | null }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="empty" role="status">
    Getting your workspace ready…
  </div>
  <div v-else-if="error" class="page-error" role="alert">
    {{ error.message }}
    <button class="btn" @click="$emit('retry')">Try again</button>
  </div>
  <slot v-else />
</template>
