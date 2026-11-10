<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { AppDialog, AppIcon } from "@sizzle/ui";
import {
  draftToken,
  emptyCheckout,
  GoApiError,
  type OrderCheckout,
  type OrderPart,
} from "@sizzle/api-client";
import { orderingApi, useOrder } from "../composables/useOrder";
import { useWorkspaceData } from "../composables/useWorkspaceData";
import { useWorkspaceStore } from "../stores/workspace";
import { isDemo } from "../api";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import QueryState from "../components/QueryState.vue";
import OrderAddressFields from "../components/OrderAddressFields.vue";
import OrderProductionDetails from "../components/OrderProductionDetails.vue";

const route = useRoute(),
  router = useRouter(),
  client = useQueryClient(),
  ui = useWorkspaceStore();
const { query, accept } = useOrder();
const draft = query.data;
const { designs } = useWorkspaceData();
const designId = computed(() =>
  typeof route.query.design === "string" ? route.query.design : "",
);
const source = useQuery({
  queryKey: computed(() => ["order-parts", designId.value]),
  queryFn: () => orderingApi.parts(designId.value),
  enabled: computed(() => !!designId.value && !isDemo),
});
const selected = reactive<Record<string, boolean>>({});
const quantities = reactive<Record<string, number>>({});
const busy = ref(false),
  error = ref(""),
  picker = ref(false),
  step = ref(0);
const checkout = reactive<OrderCheckout>(emptyCheckout());
const checkoutDirty = ref(false);
let loadingCheckout = false;
watch(
  checkout,
  () => {
    if (!loadingCheckout) checkoutDirty.value = true;
  },
  { deep: true, flush: "sync" },
);
watch(
  () => draft.value?.id,
  () => {
    loadingCheckout = true;
    Object.assign(
      checkout,
      JSON.parse(JSON.stringify(draft.value?.checkout || emptyCheckout())),
    );
    if (!checkout.shipping.country) checkout.shipping.country = "Canada";
    if (!checkout.billing.country) checkout.billing.country = "Canada";
    checkout.approved = false;
    checkoutDirty.value = false;
    loadingCheckout = false;
  },
  { immediate: true },
);
watch(
  () => draft.value?.version,
  () => {
    checkout.approved = false;
  },
);
watch(source.data, (value) => {
  for (const key of Object.keys(selected)) delete selected[key];
  for (const part of value?.parts || []) {
    selected[part.key] = true;
    quantities[part.key] = 1;
  }
  error.value = "";
});
const groups = computed(() => {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      items: NonNullable<typeof draft.value>["items"];
    }
  >();
  for (const item of draft.value?.items || []) {
    const group = groups.get(item.designId) || {
      id: item.designId,
      name: item.designName,
      items: [],
    };
    group.items.push(item);
    groups.set(item.designId, group);
  }
  return [...groups.values()];
});
const units = computed(() =>
  (draft.value?.items || []).reduce((n, item) => n + item.quantity, 0),
);
const canCheckout = computed(
  () =>
    !!draft.value?.items.length &&
    !draft.value.items.some((item) => !item.available),
);
const selectionValid = computed(
  () =>
    (source.data.value?.parts || []).some((part) => selected[part.key]) &&
    (source.data.value?.parts || [])
      .filter((part) => selected[part.key])
      .every(
        (part) =>
          Number.isInteger(quantities[part.key]) &&
          quantities[part.key]! >= 1 &&
          quantities[part.key]! <= 10000,
      ),
);
function token() {
  if (!draft.value) throw new Error("Your order is still loading.");
  return draftToken(draft.value);
}
async function closeSource() {
  await router.replace({ path: "/order" });
}
async function operation(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "The order could not be updated. Please try again.";
    if (
      cause instanceof GoApiError &&
      (cause.status === 409 || cause.status === 404)
    ) {
      await query.refetch();
      step.value = 0;
    }
  } finally {
    busy.value = false;
  }
}
async function add() {
  await operation(async () => {
    const value = source.data.value;
    if (!value || !selectionValid.value) return;
    accept(
      await orderingApi.add(
        token(),
        value.designId,
        value.revision,
        value.parts
          .filter((part) => selected[part.key])
          .map((part) => ({ key: part.key, quantity: quantities[part.key]! })),
      ),
    );
    await closeSource();
    ui.notify("Added to your order.");
  });
}
async function quantity(id: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.valueAsNumber;
  if (!Number.isInteger(value) || value < 1 || value > 10000) {
    error.value = "Enter a whole quantity between 1 and 10,000.";
    input.value = String(
      draft.value?.items.find((item) => item.id === id)?.quantity || 1,
    );
    return;
  }
  await operation(async () =>
    accept(await orderingApi.quantity(token(), id, value)),
  );
  input.value = String(
    draft.value?.items.find((item) => item.id === id)?.quantity || value,
  );
}
async function remove(ids: string[]) {
  await operation(async () => {
    for (const id of ids) accept(await orderingApi.remove(token(), id));
  });
}
async function refresh(id: string) {
  await operation(async () => accept(await orderingApi.refresh(token(), id)));
}
function applyPaperQuantity() {
  const papers =
    source.data.value?.parts.filter((part) => part.kind === "paper") || [];
  const quantity = quantities[papers[0]?.key || ""] || 1;
  for (const part of papers) quantities[part.key] = quantity;
}
async function next(nextStep: number) {
  await operation(async () => {
    const saved = await orderingApi.saveCheckout(
      token(),
      JSON.parse(JSON.stringify(checkout)),
    );
    accept(saved);
    checkoutDirty.value = false;
    step.value = nextStep;
  });
}
async function beginCheckout() {
  await operation(async () => {
    const currentVersion = draft.value?.version;
    const result = await query.refetch();
    if (result.error) throw result.error;
    if (currentVersion !== result.data?.version) {
      error.value =
        "Your order has changed. Review the updated parts before checkout.";
      return;
    }
    if (!canCheckout.value) return;
    if (!checkoutDirty.value && draft.value) {
      loadingCheckout = true;
      Object.assign(checkout, JSON.parse(JSON.stringify(draft.value.checkout)));
      checkout.approved = false;
      if (!checkout.shipping.country) checkout.shipping.country = "Canada";
      if (!checkout.billing.country) checkout.billing.country = "Canada";
      loadingCheckout = false;
    }
    step.value = 1;
  });
}
async function submit() {
  await operation(async () => {
    if (!checkout.approved)
      throw new Error("Approve the artwork and order terms before submitting.");
    const result = await orderingApi.submit(
      token(),
      JSON.parse(JSON.stringify(checkout)),
    );
    await client.invalidateQueries({ queryKey: ["orders"] });
    client.removeQueries({ queryKey: ["order-draft"] });
    await router.replace({
      path: `/orders/${result.id}`,
      query: { placed: "1" },
    });
  });
}
const details = (part: OrderPart) =>
  [
    part.size,
    part.paper,
    part.finish !== "none" && part.finish !== "None" ? part.finish : "",
  ]
    .filter(Boolean)
    .join(" · ");
const addressLines = (value: OrderCheckout["shipping"]) =>
  [
    value.company,
    value.line1,
    value.line2,
    [value.city, value.region, value.postalCode].filter(Boolean).join(", "),
    value.country,
  ].filter(Boolean);
</script>
<template>
  <PageHeading
    eyebrow="FROM SCREEN TO TABLE"
    title="Your order."
    description="A cover, a few fresh pages, or a whole new collection. Order exactly what you need."
  >
    <button v-if="!isDemo" class="btn" :disabled="busy" @click="picker = true">
      <AppIcon name="plus" />Add document
    </button>
  </PageHeading>
  <div v-if="isDemo" class="panel">
    <h2>Print ordering uses your saved workspace.</h2>
    <p>
      Sign in to your live restaurant workspace to add documents and submit
      orders. Demo designs cannot be submitted for production.
    </p>
  </div>
  <template v-else>
    <nav
      v-if="draft?.items.length"
      class="order-steps"
      aria-label="Checkout progress"
    >
      <span
        v-for="(label, index) in [
          'Your order',
          'Delivery',
          'Billing',
          'Review',
        ]"
        :key="label"
        :aria-current="step === index ? 'step' : undefined"
        :class="{ active: step === index }"
        >{{ index + 1 }}. {{ label }}</span
      >
    </nav>
    <div v-if="error" class="order-error" role="alert">{{ error }}</div>
    <QueryState
      :loading="query.isPending.value"
      :error="query.error.value"
      @retry="query.refetch()"
    >
      <div v-if="!draft?.items.length" class="panel order-empty">
        <AppIcon name="box" />
        <h2>Make room for something fresh.</h2>
        <p>
          Add a saved document, then choose quantities for its covers and menu
          pages.
        </p>
        <button class="btn primary" @click="picker = true">
          Add your first document <AppIcon name="plus" />
        </button>
      </div>
      <div v-else class="order-layout">
        <div>
          <template v-if="step === 0">
            <div
              v-for="warning in draft.warnings"
              :key="warning"
              class="order-error"
            >
              {{ warning }}
            </div>
            <section
              v-for="group in groups"
              :key="group.id"
              class="panel order-document"
            >
              <div class="order-document-heading">
                <div>
                  <small>DOCUMENT</small>
                  <h2>{{ group.name }}</h2>
                </div>
                <button
                  class="text-link"
                  :disabled="busy"
                  @click="remove(group.items.map((item) => item.id))"
                >
                  Remove document
                </button>
              </div>
              <article
                v-for="item in group.items"
                :key="item.id"
                class="order-part"
              >
                <div class="order-artwork">
                  <img
                    :src="orderingApi.previewUrl(item.id)"
                    :alt="`${item.name} artwork preview`"
                    loading="lazy"
                  />
                  <details v-if="item.pageIds.length > 1">
                    <summary>{{ item.pageIds.length }} cover surfaces</summary>
                    <img
                      v-for="pageId in item.pageIds.slice(1)"
                      :key="pageId"
                      :src="orderingApi.previewUrl(item.id, pageId)"
                      :alt="`${item.name} additional surface`"
                      loading="lazy"
                    />
                  </details>
                </div>
                <div class="order-part-info">
                  <strong>{{ item.name }}</strong>
                  <p>{{ details(item) }}</p>
                  <OrderProductionDetails :production="item.production" />
                  <p>
                    {{
                      item.kind === "cover"
                        ? "One complete cover, including all artwork surfaces"
                        : "One single-sided sheet per copy"
                    }}
                  </p>
                  <small>Saved version {{ item.revision }}</small>
                  <p v-if="!item.available" class="validation-error">
                    Document unavailable. Remove this part to continue.
                  </p>
                  <div
                    v-else-if="item.latestRevision > item.revision"
                    class="order-revision"
                  >
                    <span>A newer version is available.</span
                    ><button
                      class="text-link"
                      :disabled="busy"
                      @click="refresh(item.id)"
                    >
                      Use latest version
                    </button>
                  </div>
                  <button
                    class="text-link"
                    :disabled="busy"
                    @click="remove([item.id])"
                  >
                    Remove part
                  </button>
                </div>
                <label class="order-quantity"
                  >{{ item.unit === "cover" ? "Covers" : "Sheets"
                  }}<input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    :value="item.quantity"
                    :disabled="busy"
                    :aria-label="`${group.name} — ${item.name} quantity`"
                    @change="quantity(item.id, $event)"
                /></label>
              </article>
            </section>
          </template>
          <form
            v-else-if="step === 1"
            class="panel order-form"
            @submit.prevent="next(2)"
          >
            <h2>Where should we send it?</h2>
            <p>Delivery timing and cost will be confirmed with your quote.</p>
            <div class="order-form-grid">
              <label class="full"
                >Contact name<input
                  v-model="checkout.name"
                  required
                  maxlength="200"
                  autocomplete="name" /></label
              ><label
                >Email<input
                  v-model="checkout.email"
                  required
                  type="email"
                  maxlength="254"
                  autocomplete="email" /></label
              ><label
                >Phone<input
                  v-model="checkout.phone"
                  required
                  type="tel"
                  maxlength="50"
                  autocomplete="tel"
              /></label>
            </div>
            <OrderAddressFields
              :address="checkout.shipping"
              prefix="shipping"
            />
            <div class="order-actions">
              <button
                type="button"
                class="btn"
                :disabled="busy"
                @click="step = 0"
              >
                Back to order</button
              ><button class="btn primary" :disabled="busy">
                Continue to billing <AppIcon name="arrow" />
              </button>
            </div>
          </form>
          <form
            v-else-if="step === 2"
            class="panel order-form"
            @submit.prevent="next(3)"
          >
            <h2>Billing details</h2>
            <label class="order-checkbox"
              ><input v-model="checkout.billingSame" type="checkbox" />Use my
              shipping address for billing</label
            >
            <OrderAddressFields
              v-if="!checkout.billingSame"
              :address="checkout.billing"
              prefix="billing"
            />
            <label
              >Purchase order / reference (optional)<input
                v-model="checkout.reference"
                maxlength="200" /></label
            ><label
              >Order notes (optional)<textarea
                v-model="checkout.notes"
                maxlength="2000"
                rows="4"
              />
            </label>
            <div class="order-actions">
              <button
                type="button"
                class="btn"
                :disabled="busy"
                @click="step = 1"
              >
                Back to delivery</button
              ><button class="btn primary" :disabled="busy">
                Review order <AppIcon name="arrow" />
              </button>
            </div>
          </form>
          <form v-else class="panel order-form" @submit.prevent="submit">
            <h2>Everything in its place?</h2>
            <p
              v-for="warning in draft.warnings"
              :key="warning"
              class="order-error"
            >
              {{ warning }}
            </p>
            <p>
              Review the saved artwork, quantities and addresses before
              submitting.
            </p>
            <section
              v-for="group in groups"
              :key="group.id"
              class="order-review-document"
            >
              <h3>{{ group.name }}</h3>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="order-review-line"
              >
                <img
                  :src="orderingApi.previewUrl(item.id)"
                  :alt="`${item.name} artwork`"
                  loading="lazy"
                />
                <div>
                  <strong
                    >{{ item.quantity }}
                    {{ item.unit === "cover" ? "covers" : "sheets" }} ·
                    {{ item.name }}</strong
                  >
                  <p>{{ details(item) }} · Version {{ item.revision }}</p>
                  <OrderProductionDetails :production="item.production" />
                </div>
              </div>
            </section>
            <div class="order-form-grid">
              <section>
                <h3>Contact & delivery</h3>
                <p>
                  {{ checkout.name }}<br />{{ checkout.email }}<br />{{
                    checkout.phone
                  }}
                </p>
                <address>
                  <span
                    v-for="line in addressLines(checkout.shipping)"
                    :key="line"
                    >{{ line }}</span
                  >
                </address>
              </section>
              <section>
                <h3>Billing</h3>
                <address>
                  <span
                    v-for="line in addressLines(
                      checkout.billingSame
                        ? checkout.shipping
                        : checkout.billing,
                    )"
                    :key="line"
                    >{{ line }}</span
                  >
                </address>
              </section>
            </div>
            <p v-if="checkout.reference">
              <strong>Reference:</strong> {{ checkout.reference }}
            </p>
            <p v-if="checkout.notes">
              <strong>Notes:</strong> {{ checkout.notes }}
            </p>
            <div class="order-terms">
              <strong>Approval and invoicing</strong>
              <p>
                We’ll review your order and confirm pricing, delivery and an
                invoice. No payment is taken now. Production begins after you
                approve the quote and arrange payment.
              </p>
            </div>
            <label class="order-checkbox"
              ><input v-model="checkout.approved" type="checkbox" required />I
              approve the selected artwork versions, specifications and
              quantities, and understand that pricing requires my approval
              before production.</label
            >
            <div class="order-actions">
              <button
                type="button"
                class="btn"
                :disabled="busy"
                @click="step = 2"
              >
                Back to billing</button
              ><button
                class="btn primary"
                :disabled="busy || !checkout.approved"
              >
                {{ busy ? "Submitting…" : "Submit order for approval" }}
                <AppIcon name="arrow" />
              </button>
            </div>
          </form>
        </div>
        <aside class="panel order-summary">
          <small>MADE FOR YOUR TABLE</small>
          <h2>Order summary</h2>
          <div class="detail-line">
            <span>Documents</span><strong>{{ groups.length }}</strong>
          </div>
          <div class="detail-line">
            <span>Parts</span><strong>{{ draft.items.length }}</strong>
          </div>
          <div class="detail-line">
            <span>Total physical units</span><strong>{{ units }}</strong>
          </div>
          <hr />
          <div class="detail-line">
            <span>Print & finishing</span><span>To be quoted</span>
          </div>
          <div class="detail-line">
            <span>Delivery & tax</span><span>To be quoted</span>
          </div>
          <p class="order-terms">
            Your order is reviewed before pricing is confirmed. No payment is
            taken at checkout.
          </p>
          <button
            v-if="step === 0"
            class="btn primary"
            :disabled="busy || !canCheckout"
            @click="beginCheckout"
          >
            Continue to checkout <AppIcon name="arrow" /></button
          ><RouterLink v-if="step === 0" class="text-link" to="/designs"
            >Keep browsing designs</RouterLink
          ><button v-else class="text-link" :disabled="busy" @click="step = 0">
            Edit order contents
          </button>
        </aside>
      </div>
    </QueryState>
    <AppDialog
      :open="picker"
      title="Add a document"
      description="Choose a saved design, then specify the parts you need."
      @update:open="picker = $event"
      ><QueryState
        :loading="designs.isPending.value"
        :error="designs.error.value"
        @retry="designs.refetch()"
        ><div class="order-picker">
          <button
            v-for="design in designs.data.value || []"
            :key="design.id"
            class="btn"
            :disabled="!design.revision || design.status === 'Archived'"
            @click="
              picker = false;
              router.push({ path: '/order', query: { design: design.id } });
            "
          >
            <span
              >{{ design.name
              }}<small v-if="!design.revision"
                >Save in the editor before ordering</small
              ></span
            ><AppIcon name="plus" />
          </button>
          <p v-if="!designs.data.value?.length">
            Create and save a design to start your order.
          </p>
        </div></QueryState
      ><RouterLink class="text-link" to="/designs"
        >Go to My designs</RouterLink
      ></AppDialog
    >
    <AppDialog
      :open="!!designId"
      :title="
        source.data.value
          ? `Add ${source.data.value.name}`
          : 'Choose your parts'
      "
      description="Set a quantity for each part. Uncheck anything you don’t need."
      large
      @update:open="!$event && closeSource()"
      ><div v-if="error" class="order-error" role="alert">{{ error }}</div>
      <QueryState
        :loading="source.isPending.value"
        :error="source.error.value"
        @retry="source.refetch()"
        ><form @submit.prevent="add">
          <button
            v-if="
              (source.data.value?.parts.filter((p) => p.kind === 'paper')
                .length || 0) > 1
            "
            type="button"
            class="text-link"
            @click="applyPaperQuantity"
          >
            Apply first menu page quantity to all menu pages
          </button>
          <article
            v-for="part in source.data.value?.parts || []"
            :key="part.key"
            class="order-part order-configure"
          >
            <label class="order-checkbox"
              ><input
                v-model="selected[part.key]"
                type="checkbox"
                :aria-label="`Include ${part.name}`" /></label
            ><img
              :src="
                orderingApi.sourcePreviewUrl(
                  part.designId,
                  part.revision,
                  part.pageIds[0]!,
                )
              "
              :alt="`${part.name} artwork`"
              loading="lazy"
            />
            <div class="order-part-info">
              <strong>{{ part.name }}</strong>
              <p>{{ details(part) }}</p>
              <OrderProductionDetails :production="part.production" />
              <p>
                {{
                  part.kind === "cover"
                    ? `One complete cover · ${part.pageIds.length} artwork surfaces`
                    : "One single-sided sheet per copy"
                }}
              </p>
              <small>Saved version {{ part.revision }}</small>
            </div>
            <label class="order-quantity"
              >{{ part.unit === "cover" ? "Covers" : "Sheets"
              }}<input
                v-model.number="quantities[part.key]"
                type="number"
                min="1"
                max="10000"
                step="1"
                :required="selected[part.key]"
                :disabled="!selected[part.key] || busy"
                :aria-label="`${part.name} quantity`"
            /></label>
          </article>
          <div class="order-actions">
            <button
              class="btn"
              type="button"
              :disabled="busy"
              @click="closeSource"
            >
              Cancel</button
            ><button
              class="btn primary"
              :disabled="busy || !selectionValid || !draft"
            >
              {{ busy ? "Adding…" : "Add to order" }}<AppIcon name="plus" />
            </button>
          </div></form></QueryState
    ></AppDialog>
  </template>
  <PageFooter />
</template>
<style>
.order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
  align-items: start;
}
.order-summary {
  position: sticky;
  top: 24px;
}
.order-summary > .btn {
  width: 100%;
  justify-content: center;
}
.order-summary > .text-link {
  display: block;
  margin-top: 18px;
}
.order-summary hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 20px 0;
}
.order-steps {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 0 0 28px;
  color: var(--muted);
}
.order-steps .active {
  color: var(--wine);
  font-weight: 700;
}
.order-error {
  background: #fff0e9;
  border: 1px solid #efc2aa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.order-empty {
  text-align: center;
  padding: 64px 24px;
}
.order-empty > svg {
  width: 42px;
  height: 42px;
  margin: auto;
}
.order-document-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.order-document-heading h2 {
  margin: 8px 0;
}
.order-document-heading small,
.order-summary > small {
  font-size: 10px;
  letter-spacing: 0.12em;
}
.order-part {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 24px 0;
  border-top: 1px solid var(--line);
  margin-top: 16px;
}
.order-part img,
.order-artwork {
  width: 86px;
  flex-shrink: 0;
}
.order-artwork img {
  display: block;
  height: 112px;
  object-fit: contain;
  background: #f4eee5;
  border-radius: 4px;
}
.order-artwork summary {
  font-size: 11px;
  margin-top: 8px;
  cursor: pointer;
}
.order-artwork details img {
  margin-top: 8px;
}
.order-part-info {
  flex: 1;
  min-width: 0;
}
.order-part-info p {
  font-size: 13px;
  margin: 7px 0;
  color: var(--muted);
}
.order-part-info small {
  display: block;
  color: var(--muted);
  margin: 10px 0;
}
.order-quantity {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  width: 90px;
  flex-shrink: 0;
}
.order-quantity input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: white;
}
.order-revision {
  background: #f7f0dd;
  padding: 10px;
  font-size: 12px;
  margin: 10px 0;
}
.order-revision .text-link {
  display: block;
  margin-top: 6px;
}
.order-form h2 {
  margin-bottom: 14px;
}
.order-form > p {
  color: var(--muted);
}
.order-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.order-form-grid .full {
  grid-column: 1/-1;
}
.order-form label,
.order-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
  font-size: 13px;
}
.order-form input:not([type="checkbox"]),
.order-form textarea,
.order-form-grid input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
}
.order-checkbox {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.6;
}
.order-checkbox input {
  margin-top: 5px;
  flex-shrink: 0;
  accent-color: var(--wine);
}
.order-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 28px;
}
.order-terms {
  background: #f5efe5;
  border-radius: 7px;
  padding: 16px;
  line-height: 1.6;
  font-size: 13px;
  margin: 20px 0;
}
.order-picker {
  display: grid;
  gap: 12px;
  margin: 20px 0;
}
.order-picker > .btn {
  justify-content: space-between;
  text-align: left;
}
.order-picker small {
  display: block;
  font-size: 11px;
}
.order-review-document {
  border-top: 1px solid var(--line);
  margin: 20px 0;
  padding-top: 16px;
}
.order-review-line {
  display: flex;
  gap: 14px;
  margin: 16px 0;
}
.order-review-line img {
  width: 52px;
  height: 68px;
  object-fit: contain;
  background: #f5efe5;
}
.order-review-line p {
  font-size: 12px;
  color: var(--muted);
}
.order-form address {
  font-style: normal;
  font-size: 13px;
  line-height: 1.7;
}
.order-form address span {
  display: block;
}
.order-configure {
  align-items: center;
}
.order-configure > img {
  height: 110px;
  object-fit: contain;
}
.order-configure > .order-checkbox {
  margin: 0;
}
.order-summary .detail-line {
  gap: 14px;
  font-size: 13px;
}
@media (max-width: 1100px) {
  .order-layout {
    grid-template-columns: 1fr;
  }
  .order-summary {
    position: static;
  }
}
@media (max-width: 600px) {
  .order-form-grid {
    grid-template-columns: 1fr;
  }
  .order-part {
    flex-wrap: wrap;
    gap: 12px;
  }
  .order-quantity {
    margin-left: auto;
  }
  .order-part-info {
    min-width: 140px;
  }
  .order-document-heading {
    align-items: flex-start;
  }
  .order-actions {
    flex-wrap: wrap;
  }
  .order-steps {
    gap: 12px;
    font-size: 12px;
  }
  .order-configure > .order-part-info {
    min-width: 120px;
  }
  .order-artwork,
  .order-part img {
    width: 65px;
  }
}
</style>
