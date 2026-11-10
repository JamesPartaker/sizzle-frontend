<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { GoApiError } from "@sizzle/api-client";
import { money } from "@sizzle/utils";
import { api } from "../api";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
import { orderingApi, useOrder } from "../composables/useOrder";
import { draftToken } from "@sizzle/api-client";
import { isDemo } from "../api";
import OrderProductionDetails from "../components/OrderProductionDetails.vue";
const router = useRouter();
const { accept } = useOrder();
const reordering = ref(false), reorderError = ref("");
async function reorder() {
  reordering.value = true; reorderError.value = "";
  try { const draft = await orderingApi.draft(); accept(await orderingApi.reorder(draftToken(draft), identifier.value)); await router.push("/order"); }
  catch (error) { reorderError.value = error instanceof Error ? error.message : "Could not reorder. Please try again."; }
  finally { reordering.value = false; }
}
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
      <div v-if="route.query.placed === '1'" class="panel" role="status"><h2>Your order has been submitted.</h2><p>We’ll review your artwork and specifications, then confirm pricing and delivery with a quote and invoice. No payment has been taken.</p></div>
      <div v-if="reorderError" class="page-error" role="alert">{{ reorderError }}</div>
      <PageHeading eyebrow="YOUR PRINT ORDER" :title="`Order #${order.id}`" :description="`Placed ${date(order.date)} · ${order.qty} physical units`">
        <button v-if="!isDemo && order.items?.some(item => item.id)" class="btn" :disabled="reordering" @click="reorder">{{ reordering ? 'Adding…' : 'Reorder with latest artwork' }}</button>
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
                <img v-if="item.id" :src="orderingApi.previewUrl(item.id)" :alt="`${item.name} ordered artwork`" style="width:56px;height:74px;object-fit:contain" loading="lazy" />
                <div><small v-if="item.designName">{{ item.designName }}</small><strong style="display:block">{{ item.name }}</strong><p>{{ item.quantity }} {{ item.unit === 'cover' ? 'covers' : item.unit === 'sheet' ? 'sheets' : 'copies' }} · {{ item.size }} · {{ item.sides }}</p><p>{{ item.paper }} · {{ item.finish }}</p><OrderProductionDetails v-if="item.production" :production="item.production" /><small v-if="item.revision">Artwork version {{ item.revision }}</small></div>
                <span>{{ item.amount == null ? 'Awaiting quote' : `${money(item.amount)} CAD` }}</span>
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
            <div class="detail-line order-summary-total"><strong>Total</strong><strong>{{ order.total == null ? 'Awaiting quote' : `${money(order.total)} CAD` }}</strong></div>
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
