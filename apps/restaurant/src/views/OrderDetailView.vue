<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { AppIcon, MenuPreview } from "@sizzle/ui";
import { money } from "@sizzle/utils";
import { useWorkspaceData } from "../composables/useWorkspaceData";
import { useWorkspaceStore } from "../stores/workspace";
import { isDemo } from "../api";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
const route = useRoute(),
  ui = useWorkspaceStore();
const { orders, templates } = useWorkspaceData();
const order = computed(() =>
  orders.data.value?.find((o) => o.id === route.params.id),
);
const template = computed(() =>
  templates.data.value?.find((t) => t.id === order.value?.template),
);
const delivered = computed(() => order.value?.status === "Delivered");
</script>
<template>
  <RouterLink class="back" to="/orders"
    ><AppIcon name="back" />Back to print orders</RouterLink
  >
  <QueryState
    :loading="orders.isPending.value"
    :error="orders.error.value"
    @retry="orders.refetch()"
    ><template v-if="order">
      <PageHeading
        eyebrow="GOOD THINGS ARE ON THEIR WAY"
        :title="`Order #${order.id}`"
        :description="`Placed ${order.date} · ${order.qty} printed menus`"
        ><span
          :class="['badge', { orange: order.status === 'In production' }]"
          >{{ order.status }}</span
        ></PageHeading
      >
      <div class="detail-grid">
        <div>
          <section class="panel">
            <h2>
              {{
                delivered
                  ? "Made it to your table."
                  : "Your menus are coming to life."
              }}
            </h2>
            <p class="text-xs">
              {{ delivered ? "Delivered " : "Estimated delivery: "
              }}{{ order.delivery }}
            </p>
            <ul class="timeline">
              <li>
                Order confirmed<small
                  >{{ order.date }} · We’ve received your design and
                  payment.</small
                >
              </li>
              <li>
                In production<small
                  >Your menus are being printed and finished with care.</small
                >
              </li>
              <li :class="{ pending: !delivered }">
                Dispatched<small>{{
                  delivered
                    ? "Your order left our print studio."
                    : "Tracking will appear here once your order ships."
                }}</small>
              </li>
              <li :class="{ pending: !delivered }">
                Delivered<small>{{
                  delivered ? order.delivery : "Expected " + order.delivery
                }}</small>
              </li>
            </ul>
          </section>
          <section class="panel">
            <h2>What’s in the box</h2>
            <div class="doc-name">
              <div class="doc-thumb">
                <MenuPreview v-if="template" :template="template" />
              </div>
              <div>
                <strong>{{ order.name }}</strong
                ><small
                  >{{ order.qty }} copies · A4 portrait · Double-sided</small
                ><small>{{ order.paper }}</small>
              </div>
            </div>
          </section>
        </div>
        <div>
          <section class="panel">
            <h2>Order summary</h2>
            <div class="detail-line">
              <span class="muted">{{ order.qty }} printed menus</span
              ><span>{{ money(order.total - 16) }}</span>
            </div>
            <div class="detail-line">
              <span class="muted">Shipping</span><span>$8.00</span>
            </div>
            <div class="detail-line">
              <span class="muted">Tax</span><span>$8.00</span>
            </div>
            <div class="detail-line order-summary-total">
              <strong>Total paid</strong
              ><strong>{{ money(order.total) }} CAD</strong>
            </div>
            <p v-if="isDemo" class="text-[10px]">
              Demo order · Payment complete
            </p>
          </section>
          <section v-if="isDemo" class="panel">
            <h2>Delivery details</h2>
            <p class="text-xs">
              Sunday Table<br />Jamie Laurent<br />124 Ossington Avenue<br />Toronto,
              ON M6J 2Z5<br />Canada
            </p>
            <p class="text-[10px]">Sample delivery address</p>
          </section>
          <button class="btn w-full" @click="ui.helpOpen = true">
            <AppIcon name="help" />Need a hand with your order?
          </button>
        </div>
      </div>
    </template>
    <div v-else class="empty">
      Order not found. <RouterLink to="/orders">Return to orders</RouterLink>
    </div></QueryState
  ><PageFooter />
</template>
