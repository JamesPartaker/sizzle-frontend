<script setup lang="ts">
import { computed, ref } from "vue";
import { AppIcon } from "@sizzle/ui";
import { money } from "@sizzle/utils";
import { useWorkspaceData } from "../composables/useWorkspaceData";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
const { orders } = useWorkspaceData();
const search = ref(""),
  status = ref("All orders");
const filtered = computed(() =>
  (orders.data.value || []).filter(
    (o) =>
      `${o.id} ${o.name}`.toLowerCase().includes(search.value.toLowerCase()) &&
      (status.value === "All orders" || status.value === o.status),
  ),
);
const inProduction = computed(() =>
  orders.data.value?.find((o) => o.status === "In production"),
);
</script>
<template>
  <PageHeading
    eyebrow="FROM SCREEN TO TABLE"
    title="Fresh off the press."
    description="Keep an eye on the good things making their way to you."
    ><RouterLink class="btn" to="/designs"
      >Browse your designs <AppIcon name="arrow" /></RouterLink
  ></PageHeading>
  <div v-if="inProduction" class="order-banner">
    <AppIcon name="box" />
    <div>
      <strong>A little something is in the works.</strong>
      <p>
        Your autumn menus are in production. Estimated arrival: October 28–30.
      </p>
    </div>
    <RouterLink class="text-link ml-auto" :to="`/orders/${inProduction.id}`"
      >View order <AppIcon name="arrow"
    /></RouterLink>
  </div>
  <div class="toolbar">
    <label class="search"
      ><AppIcon name="search" /><input
        v-model="search"
        type="search"
        placeholder="Search order number or design…"
        aria-label="Search order number or design…" /></label
    ><select v-model="status" aria-label="Order status">
      <option>All orders</option>
      <option>In production</option>
      <option>Delivered</option>
    </select>
  </div>
  <QueryState
    :loading="orders.isPending.value"
    :error="orders.error.value"
    @retry="orders.refetch()"
    ><div class="rows orders">
      <div class="table-head">
        <span>Order</span><span>Design & quantity</span><span>Status</span
        ><span>Order date</span><span>Total</span><span />
      </div>
      <RouterLink
        v-for="order in filtered"
        :key="order.id"
        class="order-row"
        :to="`/orders/${order.id}`"
        ><span class="order-title"
          >#{{ order.id }}<small>Print order</small></span
        ><span class="order-title"
          >{{ order.name
          }}<small>{{ order.qty }} copies · A4 · Double-sided</small></span
        ><span
          :class="['badge', { orange: order.status === 'In production' }]"
          >{{ order.status }}</span
        ><span class="muted">{{ order.date }}</span
        ><span>{{ money(order.total) }} CAD</span><AppIcon name="chevron"
      /></RouterLink>
      <div v-if="!filtered.length" class="empty">No matching orders.</div>
    </div></QueryState
  ><PageFooter />
</template>
