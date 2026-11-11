<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { AppIcon } from "@sizzle/ui";
import type { MenuItem } from "../services/restaurant-data";
import { validPrice } from "../services/menu-items-text";

type ItemDetails = Pick<MenuItem, "options" | "highlighted" | "designNotes">;

const props = defineProps<{ item: ItemDetails & { name: string } }>();
const emit = defineEmits<{ apply: [details: ItemDetails]; close: [] }>();
const dialog = useTemplateRef<HTMLDialogElement>("details-dialog");
const options = ref(
  (props.item.options ?? []).map(({ label, priceAdjustment }) => ({
    label,
    adjustment: priceAdjustment === undefined ? "" : String(priceAdjustment),
  })),
);
const highlighted = ref(Boolean(props.item.highlighted));
const designNotes = ref(props.item.designNotes ?? "");
const error = ref("");

onMounted(() => dialog.value?.showModal());

function addOption() {
  options.value.push({ label: "", adjustment: "" });
}

function apply() {
  const entries = options.value
    .map(({ label, adjustment }) => ({
      label: label.trim(),
      adjustment: adjustment.trim(),
    }))
    .filter(({ label, adjustment }) => label || adjustment);
  const invalid = entries.findIndex(
    ({ label, adjustment }) =>
      !label || (adjustment !== "" && !validPrice(Number(adjustment), -999999)),
  );
  if (invalid >= 0) {
    error.value = `Check the label and price adjustment for option ${invalid + 1}.`;
    return;
  }
  emit("apply", {
    options: entries.length
      ? entries.map(({ label, adjustment }) => ({
          label,
          ...(adjustment === "" ? {} : { priceAdjustment: Number(adjustment) }),
        }))
      : undefined,
    highlighted: highlighted.value || undefined,
    designNotes: designNotes.value.trim() || undefined,
  });
  dialog.value?.close();
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="details-dialog"
      class="item-details-dialog"
      aria-labelledby="item-details-title"
      @close="emit('close')"
    >
      <form class="item-details-form" @submit.prevent="apply">
        <header>
          <div>
            <h2 id="item-details-title">Item details</h2>
            <p>{{ item.name || "Untitled item" }}</p>
          </div>
          <button
            type="button"
            aria-label="Close item details"
            class="icon-button"
            @click="dialog?.close()"
          >
            <AppIcon name="close" />
          </button>
        </header>

        <div class="item-details-body">
          <fieldset>
            <legend>Options and add-ons</legend>
            <p>
              Enter the wording to print and a price adjustment if it applies.
            </p>
            <div
              v-for="(option, index) in options"
              :key="index"
              class="item-option"
            >
              <label
                >Label
                <input
                  v-model="option.label"
                  maxlength="120"
                  placeholder="e.g. Add chicken"
                  :aria-label="`Option ${index + 1} label`"
                />
              </label>
              <label
                >Price adjustment
                <input
                  v-model="option.adjustment"
                  inputmode="decimal"
                  maxlength="12"
                  placeholder="e.g. 4.00"
                  :aria-label="`Option ${index + 1} price adjustment`"
                />
              </label>
              <button
                type="button"
                class="icon-button"
                :aria-label="`Remove option ${index + 1}`"
                @click="options.splice(index, 1)"
              >
                <AppIcon name="close" />
              </button>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="options.length >= 30"
              @click="addOption"
            >
              <AppIcon name="plus" />Add option
            </button>
          </fieldset>

          <label class="highlight-item">
            <input v-model="highlighted" type="checkbox" />
            <span>
              <strong>Highlight this item</strong>
              <small>Give it more prominence in the design.</small>
            </span>
          </label>

          <label class="design-notes">
            <strong>Design notes</strong>
            <span
              >Instructions for the designer. These notes stay out of the
              printed menu.</span
            >
            <textarea
              v-model="designNotes"
              maxlength="500"
              rows="4"
              placeholder="e.g. Keep the protein options together."
            />
          </label>
        </div>

        <footer>
          <p v-if="error" role="alert">{{ error }}</p>
          <button type="button" class="btn" @click="dialog?.close()">
            Cancel
          </button>
          <button type="submit" class="btn primary">Apply details</button>
        </footer>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped>
.item-details-dialog {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(100%, 490px);
  max-width: 100%;
  height: 100%;
  height: 100dvh;
  max-height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--line);
  background: #fffdfa;
  color: var(--ink);
}
.item-details-dialog::backdrop {
  background: #302a2655;
}
.item-details-form {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
header,
footer {
  padding: 20px 24px;
}
header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line);
}
h2 {
  margin: 0;
  font: 26px var(--serif);
}
p {
  margin: 4px 0 12px;
  color: var(--muted);
}
header p {
  margin-bottom: 0;
  overflow-wrap: anywhere;
}
.icon-button {
  display: inline-grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--wine);
  flex-shrink: 0;
}
.item-details-body {
  overflow-y: auto;
  padding: 20px 24px;
}
fieldset {
  border: 0;
  margin: 0 0 20px;
  padding: 0;
  min-width: 0;
}
legend {
  font-weight: 700;
}
.item-option {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) 36px;
  align-items: end;
  gap: 8px;
  margin-bottom: 10px;
}
.item-option label,
.design-notes {
  display: grid;
  gap: 5px;
}
.item-option label {
  font-size: 12px;
  font-weight: 600;
}
.item-option input,
textarea {
  width: 100%;
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  color: var(--ink);
  font: inherit;
}
.highlight-item {
  display: flex;
  align-items: start;
  gap: 8px;
  margin: 0 0 20px;
}
.highlight-item input {
  margin-top: 3px;
  accent-color: var(--wine);
}
.highlight-item small,
.design-notes span {
  display: block;
  color: var(--muted);
}
textarea {
  resize: vertical;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--line);
}
footer p {
  flex-basis: 100%;
  color: var(--wine);
}
</style>
