<script setup lang="ts">
defineProps<{ production: Record<string, unknown> }>();
</script>
<template>
  <p v-if="production.kind === 'cover'" class="order-production-details">
    {{ production.type === "binder" ? "Binder cover" : "Printed cover" }}
    <span v-if="typeof production.materialColor === 'string'">
      · Material colour
      <span
        class="order-colour-swatch"
        :style="{ backgroundColor: production.materialColor }"
      />
      {{ production.materialColor }}</span
    >
    <span
      v-if="
        production.decoration !== 'none' &&
        typeof production.decorationColor === 'string'
      "
    >
      · {{ production.decoration }} colour
      <span
        class="order-colour-swatch"
        :style="{ backgroundColor: production.decorationColor }"
      />
      {{ production.decorationColor }}</span
    >
  </p>
</template>
<style scoped>
.order-production-details {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
}
.order-colour-swatch {
  display: inline-block;
  width: 11px;
  height: 11px;
  vertical-align: middle;
  border: 1px solid #0002;
  border-radius: 50%;
}
</style>
