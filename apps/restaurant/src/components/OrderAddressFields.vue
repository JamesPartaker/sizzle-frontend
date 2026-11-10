<script setup lang="ts">
import type { OrderAddress } from "@sizzle/api-client";
defineProps<{ address: OrderAddress; prefix: string }>();
</script>
<template>
  <div class="order-form-grid">
    <label :for="`${prefix}-company`" class="full"
      >Restaurant / company<input
        :id="`${prefix}-company`"
        v-model="address.company"
        maxlength="200"
        :autocomplete="`${prefix} organization`"
    /></label>
    <label :for="`${prefix}-line1`" class="full"
      >Street address<input
        :id="`${prefix}-line1`"
        v-model="address.line1"
        required
        maxlength="200"
        :autocomplete="`${prefix} address-line1`"
    /></label>
    <label :for="`${prefix}-line2`" class="full"
      >Apartment, suite, etc. (optional)<input
        :id="`${prefix}-line2`"
        v-model="address.line2"
        maxlength="200"
        :autocomplete="`${prefix} address-line2`"
    /></label>
    <label :for="`${prefix}-city`"
      >City<input
        :id="`${prefix}-city`"
        v-model="address.city"
        required
        maxlength="200"
        :autocomplete="`${prefix} address-level2`"
    /></label>
    <label :for="`${prefix}-region`"
      >Province / state / region<input
        :id="`${prefix}-region`"
        v-model="address.region"
        required
        maxlength="200"
        :autocomplete="`${prefix} address-level1`"
    /></label>
    <label :for="`${prefix}-postal`"
      >Postal / ZIP code<input
        :id="`${prefix}-postal`"
        v-model="address.postalCode"
        required
        maxlength="200"
        :autocomplete="`${prefix} postal-code`"
    /></label>
    <label :for="`${prefix}-country`"
      >Country<input
        :id="`${prefix}-country`"
        v-model="address.country"
        required
        maxlength="200"
        :autocomplete="`${prefix} country-name`"
    /></label>
  </div>
</template>
