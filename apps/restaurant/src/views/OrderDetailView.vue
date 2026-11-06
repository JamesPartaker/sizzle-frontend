<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { GoApiError } from "@sizzle/api-client";
import { money } from "@sizzle/utils";
import { api } from "../api";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
const route = useRoute();
const identifier = computed(() => String(route.params.id));
const query = useQuery({
  queryKey: computed(() => ["order", identifier.value]),
  queryFn: async () => {
    try { return await api.orders.get(identifier.value); }
    catch (error) { if (error instanceof GoApiError && error.status === 404) return null; throw error; }
  },
});
const order = query.data;
const date = (value: string) => new Date(value).toLocaleDateString();
</script>
<template>
  <RouterLink class="back" to="/orders">← Back to print orders</RouterLink>
  <QueryState :loading="query.isPending.value" :error="query.error.value" @retry="query.refetch()">
    <template v-if="order">
      <PageHeading eyebrow="YOUR PRINT ORDER" :title="`Order #${order.id}`" :description="`Placed ${date(order.date)} · ${order.qty} printed menus`">
        <span class="badge">{{ order.status }}</span>
      </PageHeading>
      <div class="detail-grid">
        <div>
          <section class="panel">
            <h2>Delivery</h2>
            <p>{{ order.status }}</p>
            <p v-if="order.delivery">{{ order.status === 'Delivered' ? 'Delivered' : 'Estimated delivery' }}: {{ order.delivery }}</p>
            <p v-if="order.deliveryDetails?.method">{{ order.deliveryDetails.method }}</p>
            <p v-if="order.deliveryDetails?.carrier">Carrier: {{ order.deliveryDetails.carrier }}</p>
            <p v-if="order.deliveryDetails?.tracking">Tracking: {{ order.deliveryDetails.tracking }}</p>
          </section>
          <section class="panel">
            <h2>What’s in the box</h2>
            <template v-if="order.items?.length">
              <div v-for="(item, index) in order.items" :key="index" class="detail-line">
                <div><strong>{{ item.name }}</strong><p>{{ item.quantity }} copies · {{ item.size }} · {{ item.sides }}</p><p>{{ item.paper }} · {{ item.finish }}</p></div>
                <span>{{ money(item.amount) }} CAD</span>
              </div>
            </template>
            <p v-else>{{ order.name }} · {{ order.qty }} copies<span v-if="order.paper"> · {{ order.paper }}</span></p>
          </section>
        </div>
        <div>
          <section class="panel">
            <h2>Order summary</h2>
            <div v-if="order.subtotal != null" class="detail-line"><span>Subtotal</span><span>{{ money(order.subtotal) }}</span></div>
            <div v-if="order.shipping != null" class="detail-line"><span>Shipping</span><span>{{ money(order.shipping) }}</span></div>
            <div v-if="order.tax != null" class="detail-line"><span>Tax</span><span>{{ money(order.tax) }}</span></div>
            <div class="detail-line order-summary-total"><strong>Total</strong><strong>{{ money(order.total) }} CAD</strong></div>
            <p v-if="order.payment?.status">Payment: {{ order.payment.status }}</p>
            <p v-if="order.payment?.method">{{ order.payment.method }}</p>
          </section>
          <section v-if="order.shippingAddress?.length" class="panel"><h2>Shipping address</h2><p v-for="(line, index) in order.shippingAddress" :key="index">{{ line }}</p></section>
          <section v-if="order.billingAddress?.length" class="panel"><h2>Billing address</h2><p v-for="(line, index) in order.billingAddress" :key="index">{{ line }}</p></section>
        </div>
      </div>
    </template>
    <div v-else class="empty">Order not found. <RouterLink to="/orders">Return to orders</RouterLink></div>
  </QueryState>
  <PageFooter />
</template>
