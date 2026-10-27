<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { AppIcon } from "@sizzle/ui";
import PageHeading from "../../restaurant/src/components/PageHeading.vue";
import PageFooter from "../../restaurant/src/components/PageFooter.vue";
import { adminRepository, statuses } from "./data";
const route = useRoute();
const id = computed(() => String(route.params.id));
const client = useQueryClient();
const query = useQuery({
  queryKey: computed(() => ["admin", "order-details", id.value]),
  queryFn: ({ signal }) => adminRepository.getOrder(id.value, signal),
});
const order = query.data;
const status = ref("");
const notice = ref("");
watch(order, (value) => { status.value = value?.status ?? ""; notice.value = ""; }, { immediate: true });
const save = useMutation({
  mutationFn: (nextStatus: string) => adminRepository.updateOrderStatus(id.value, nextStatus),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "orders"] }),
      client.invalidateQueries({ queryKey: ["admin", "order-details", id.value] }),
    ]);
    notice.value = "Order status updated in this demo session.";
  },
});
const money = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "America/Toronto" }).format(new Date(value));
</script>
<template>
  <RouterLink class="back" to="/orders"><AppIcon name="back" />Back to all orders</RouterLink>
  <div v-if="query.isPending.value" class="empty" role="status">Loading order details…</div>
  <div v-else-if="query.isError.value" class="page-error" role="alert">Couldn’t load this order. <button class="btn" @click="query.refetch()">Try again</button></div>
  <template v-else-if="order">
    <PageHeading eyebrow="FROM SCREEN TO TABLE" :title="`Order #${order.id}`" :description="`Placed ${date(order.placedAt)} · ${order.restaurant}`"><span :class="['badge', { orange: ['Pending', 'In production'].includes(order.status), gray: order.status === 'Cancelled' }]">{{ order.status }}</span></PageHeading>
    <p class="admin-demo-note">Demo order · All customer, payment and delivery details are illustrative.</p>
    <div v-if="notice" class="admin-notice" role="status">{{ notice }}</div>
    <div class="detail-grid admin-order-details">
      <div>
        <section class="panel"><h2>Order items</h2>
          <article v-for="item in order.items" :key="item.designId" class="admin-order-item">
            <div class="admin-item-heading"><div><strong>{{ item.name }}</strong><small>Design {{ item.designId }}</small></div><strong>{{ money(item.amount) }}</strong></div>
            <dl class="admin-detail-list"><div><dt>Quantity</dt><dd>{{ item.quantity }} copies</dd></div><div><dt>Size</dt><dd>{{ item.size }}</dd></div><div><dt>Printing</dt><dd>{{ item.sides }}</dd></div><div><dt>Paper</dt><dd>{{ item.paper }}</dd></div><div><dt>Finish</dt><dd>{{ item.finish }}</dd></div></dl>
          </article>
        </section>
        <section class="panel"><h2>Customer details</h2><dl class="admin-detail-list"><div><dt>Restaurant</dt><dd>{{ order.restaurant }}</dd></div><div><dt>Customer</dt><dd>{{ order.customerName }}</dd></div><div><dt>Email</dt><dd><a :href="`mailto:${order.email}`">{{ order.email }}</a></dd></div><div><dt>Phone</dt><dd><a :href="`tel:${order.phone.replace(/\s/g, '')}`">{{ order.phone }}</a></dd></div></dl></section>
        <section class="panel"><h2>Delivery & tracking</h2><dl class="admin-detail-list"><div><dt>Method</dt><dd>{{ order.delivery.method }}</dd></div><div><dt>Estimated arrival</dt><dd>{{ order.status === 'Cancelled' ? 'Not applicable — order cancelled' : order.delivery.estimate }}</dd></div><div><dt>Carrier</dt><dd>{{ order.delivery.carrier || 'Not assigned' }}</dd></div><div><dt>Tracking number</dt><dd>{{ order.delivery.tracking || 'Available after dispatch' }}</dd></div></dl></section>
        <section class="panel"><h2>Order notes</h2><p class="admin-order-note">{{ order.notes || 'No notes provided.' }}</p></section>
      </div>
      <div>
        <section class="panel"><h2>Order status</h2><form class="admin-form admin-status-form" @submit.prevent="save.mutate(status)"><label for="order-status">Update status</label><select id="order-status" v-model="status" :disabled="save.isPending.value"><option v-for="option in statuses.orders" :key="option">{{ option }}</option></select><p v-if="save.isError.value" class="validation-error" role="alert">Couldn’t save the status. Please try again.</p><button class="btn primary" :disabled="status === order.status || save.isPending.value">{{ save.isPending.value ? 'Saving…' : 'Save status' }}</button></form></section>
        <section class="panel"><h2>Order summary</h2><dl class="admin-detail-list"><div><dt>Subtotal</dt><dd>{{ money(order.subtotal) }}</dd></div><div><dt>Shipping</dt><dd>{{ money(order.shipping) }}</dd></div><div><dt>Tax (HST)</dt><dd>{{ money(order.tax) }}</dd></div><div class="admin-total"><dt>Total (CAD)</dt><dd>{{ money(order.total) }}</dd></div></dl></section>
        <section class="panel"><h2>Payment details</h2><dl class="admin-detail-list"><div><dt>Payment status</dt><dd>{{ order.payment.status }}</dd></div><div><dt>Method</dt><dd>{{ order.payment.method }}</dd></div><div><dt>Reference</dt><dd>{{ order.payment.reference }}</dd></div></dl></section>
        <section class="panel"><h2>Shipping address</h2><address class="admin-address"><span v-for="(line, index) in order.shippingAddress" :key="index">{{ line }}</span></address></section>
        <section class="panel"><h2>Billing address</h2><address class="admin-address"><span v-for="(line, index) in order.billingAddress" :key="index">{{ line }}</span></address></section>
      </div>
    </div>
  </template>
  <section v-else class="empty"><h1>Order not found.</h1><p>This order does not exist or is no longer available.</p><RouterLink class="btn" to="/orders">Return to all orders</RouterLink></section>
  <PageFooter />
</template>
