<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { GoApiError } from "@sizzle/api-client";
import { AppIcon } from "@sizzle/ui";
import MenuItemDetails from "../components/MenuItemDetails.vue";
import {
  dietaryAttributes,
  restaurantData,
  type RestaurantData,
  type MenuItem,
  type MenuGroup,
} from "../services/restaurant-data";
import {
  itemsFromText,
  itemsToText,
  validPrice,
} from "../services/menu-items-text";

const details = [
  { key: "name", label: "Restaurant name", type: "text" },
  { key: "slogan", label: "Slogan", type: "text" },
  { key: "address", label: "Address", multiline: true },
  { key: "hours", label: "Opening hours", multiline: true },
  { key: "phone", label: "Phone number", type: "tel" },
  { key: "website", label: "Website", type: "text" },
  { key: "email", label: "Email", type: "email" },
] as const;

const route = useRoute();
const router = useRouter();
const detailsPath = "/data-management";
const menuPath = "/data-management/menu-items";
const menuPage = computed(() => route.params.section === "menu-items");
const form = useTemplateRef<HTMLFormElement>("data-form");
type MenuRow = Omit<MenuItem, "price"> & { price: number | string };
type RestaurantDraft = Omit<RestaurantData, "menu"> & {
  menu: (Omit<MenuGroup, "items"> & { items: MenuRow[] })[];
};
const draft = ref<RestaurantDraft>();
const saved = ref("");
const loading = ref(true);
const saving = ref(false);
const conflict = ref(false);
const error = ref("");
const status = ref("");
const groupIndex = ref(0);
const group = computed(() => draft.value?.menu[groupIndex.value]);
const detailsIndex = ref<number>();
const detailsItem = computed(() =>
  detailsIndex.value === undefined
    ? undefined
    : group.value?.items[detailsIndex.value],
);
const bulkText = ref<string>();
const bulkError = ref("");
const spareRows = 5;
const hasItem = (item: MenuRow) =>
  Boolean(
    item.name.trim() ||
    item.description.trim() ||
    String(item.price).trim() ||
    item.attributes.length ||
    item.options?.length ||
    item.highlighted ||
    item.designNotes,
  );
function detailsSummary(item: MenuRow) {
  const options = item.options?.length ?? 0;
  return (
    [
      options ? `${options} ${options === 1 ? "option" : "options"}` : "",
      item.highlighted ? "Highlighted" : "",
      item.designNotes ? "Design note" : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Details"
  );
}
function populatedItems(rows: MenuRow[]): MenuItem[] {
  return rows.filter(hasItem).map((row) => ({
    ...row,
    price: Number(row.price),
  }));
}
const groupItems = computed(() => populatedItems(group.value?.items ?? []));
const snapshot = computed(
  () =>
    draft.value && {
      ...draft.value,
      menu: draft.value.menu.map((entry) => ({
        ...entry,
        items: populatedItems(entry.items),
      })),
    },
);
const dirty = computed(() =>
  Boolean(
    snapshot.value &&
    (JSON.stringify(snapshot.value) !== saved.value ||
      (bulkText.value !== undefined &&
        bulkText.value !== itemsToText(groupItems.value))),
  ),
);

function editItem(index: number, patch: Partial<MenuRow>) {
  const items = group.value!.items;
  while (items.length <= index)
    items.push({ name: "", description: "", price: "", attributes: [] });
  Object.assign(items[index], patch);
}

function toggleAttribute(
  index: number,
  attribute: MenuItem["attributes"][number],
  checked: boolean,
) {
  const attributes = new Set(group.value!.items[index]?.attributes);
  if (checked) attributes.add(attribute);
  else attributes.delete(attribute);
  editItem(index, { attributes: [...attributes] });
}

async function load() {
  loading.value = true;
  error.value = "";
  status.value = "";
  try {
    draft.value = await restaurantData.load();
    saved.value = JSON.stringify(draft.value);
    groupIndex.value = 0;
    bulkText.value = undefined;
    bulkError.value = "";
    conflict.value = false;
  } catch {
    error.value = "Could not load restaurant data. Try again.";
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function applyText() {
  if (bulkText.value === undefined || !group.value) return true;
  try {
    if (bulkText.value !== itemsToText(groupItems.value))
      group.value.items = itemsFromText(bulkText.value, groupItems.value);
    bulkText.value = undefined;
    bulkError.value = "";
    return true;
  } catch (error) {
    bulkError.value = (error as Error).message;
    return false;
  }
}

function selectGroup(index: number) {
  if (applyText()) groupIndex.value = index;
}

function addGroup() {
  if (!draft.value || !applyText()) return;
  groupIndex.value = draft.value.menu.length;
  draft.value.menu.push({ name: "", description: "", items: [] });
}

function removeGroup() {
  if (!draft.value) return;
  bulkText.value = undefined;
  bulkError.value = "";
  draft.value.menu.splice(groupIndex.value, 1);
  groupIndex.value = Math.max(
    0,
    Math.min(groupIndex.value, draft.value.menu.length - 1),
  );
}

async function save() {
  if (!draft.value || saving.value || conflict.value) return;
  if (!applyText()) {
    await router.push(menuPath);
    return;
  }
  error.value = "";
  status.value = "";
  const data = snapshot.value!;
  const invalidGroup = data.menu.findIndex(
    (group) =>
      !group.name.trim() ||
      group.description.length > 500 ||
      group.items.some(
        (item) =>
          !item.name.trim() ||
          item.name.length > 120 ||
          item.description.length > 500 ||
          !validPrice(item.price),
      ),
  );
  if (invalidGroup >= 0) {
    groupIndex.value = invalidGroup;
    error.value =
      "Check the group name, item names, descriptions, and prices in the selected group.";
    await router.push(menuPath);
    return;
  }
  const groupNames = data.menu.map(({ name }) => name.trim().toLowerCase());
  if (new Set(groupNames).size !== groupNames.length) {
    error.value = "Use a unique name for each menu group.";
    await router.push(menuPath);
    return;
  }
  const itemCount = data.menu.reduce(
    (count, { items }) => count + items.length,
    0,
  );
  if (itemCount > 1000) {
    error.value = "The menu can contain up to 1,000 items.";
    await router.push(menuPath);
    return;
  }
  const email = form.value?.querySelector<HTMLInputElement>(
    'input[type="email"]',
  );
  if (email && !email.validity.valid) {
    error.value = "Enter a valid email address.";
    await router.push(detailsPath);
    email.focus();
    return;
  }
  if (
    draft.value.customFields.some(
      ({ label, value }) => !label.trim() || !value.trim(),
    )
  ) {
    error.value = "Enter a label and a value for each custom field.";
    await router.push(detailsPath);
    return;
  }
  saving.value = true;
  try {
    draft.value = await restaurantData.save(data);
    saved.value = JSON.stringify(draft.value);
    status.value = "Restaurant data saved.";
  } catch (reason) {
    conflict.value = reason instanceof GoApiError && reason.status === 409;
    error.value = conflict.value
      ? "Someone saved a newer version. Your draft is still here. Reload to edit the latest version."
      : reason instanceof GoApiError || !(reason instanceof Error)
        ? "Could not save restaurant data. Try again."
        : reason.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <header class="page-heading">
    <div>
      <h1>Data management</h1>
      <p>
        Manage the restaurant details and menu items the AI designer can use.
      </p>
    </div>
    <button
      v-if="draft"
      class="btn primary"
      type="submit"
      form="restaurant-data-form"
      :disabled="loading || saving || conflict || !dirty"
    >
      <AppIcon name="check" />{{ saving ? "Saving…" : "Save changes" }}
    </button>
  </header>

  <nav class="data-tabs" aria-label="Data management sections">
    <RouterLink
      :to="detailsPath"
      :aria-current="!menuPage ? 'page' : undefined"
    >
      Restaurant details
    </RouterLink>
    <RouterLink :to="menuPath" :aria-current="menuPage ? 'page' : undefined">
      Menu items
    </RouterLink>
  </nav>

  <p v-if="loading" role="status">Loading restaurant data…</p>
  <p v-if="status && !dirty" class="save-status" role="status">{{ status }}</p>
  <div v-if="error" class="data-error">
    <p role="alert">{{ error }}</p>
    <button
      v-if="(!draft || conflict) && !loading"
      type="button"
      class="btn"
      @click="load"
    >
      {{ conflict ? "Discard draft and reload" : "Try again" }}
    </button>
  </div>

  <form
    v-if="draft && !loading"
    id="restaurant-data-form"
    ref="data-form"
    novalidate
    @submit.prevent="save"
  >
    <fieldset v-show="!menuPage" class="data-section" :disabled="saving">
      <legend>Restaurant details</legend>
      <div class="details-grid">
        <label v-for="field in details" :key="field.key">
          {{ field.label }}
          <textarea
            v-if="'multiline' in field"
            v-model="draft[field.key]"
            rows="3"
            maxlength="500"
          />
          <input
            v-else
            v-model="draft[field.key]"
            :type="field.type"
            maxlength="500"
          />
        </label>
      </div>

      <div class="data-heading">
        <div>
          <h2>Custom fields</h2>
          <p>
            Add details you reuse in designs, such as social handles or a
            reservation link.
          </p>
        </div>
        <button
          type="button"
          class="btn"
          :disabled="draft.customFields.length >= 50"
          @click="draft.customFields.push({ label: '', value: '' })"
        >
          <AppIcon name="plus" />Add field
        </button>
      </div>
      <div
        v-for="(field, index) in draft.customFields"
        :key="index"
        class="custom-row"
      >
        <label>Label<input v-model="field.label" maxlength="80" /></label>
        <label
          >Value<textarea v-model="field.value" rows="1" maxlength="500" />
        </label>
        <button
          type="button"
          class="remove"
          :aria-label="`Remove field ${field.label || index + 1}`"
          @click="draft.customFields.splice(index, 1)"
        >
          <AppIcon name="trash" />
        </button>
      </div>
    </fieldset>

    <fieldset v-if="menuPage" class="data-section menu-section" :disabled="saving">
      <legend>Menu items</legend>
      <div class="menu-grid">
        <nav class="groups" aria-label="Menu groups">
          <button
            v-for="(entry, index) in draft.menu"
            :key="index"
            type="button"
            :aria-pressed="groupIndex === index"
            @click="selectGroup(index)"
          >
            <span>{{ entry.name || "Untitled group" }}</span>
            <span>{{ entry.items.filter(hasItem).length }}</span>
          </button>
          <button
            type="button"
            class="btn"
            :disabled="draft.menu.length >= 50"
            @click="addGroup"
          >
            <AppIcon name="plus" />Add group
          </button>
        </nav>

        <div v-if="group" class="group-editor">
          <div class="details-grid">
            <label
              >Group name<input
                v-model="group.name"
                maxlength="120"
                placeholder="e.g. Small plates"
            /></label>
            <label
              >Group description<textarea
                v-model="group.description"
                rows="1"
                maxlength="500"
              />
            </label>
          </div>

          <div class="data-heading">
            <h2>Items in this group</h2>
            <button
              v-if="bulkText === undefined"
              type="button"
              class="btn"
              @click="bulkText = itemsToText(groupItems)"
            >
              Edit as text
            </button>
            <button v-else type="button" class="btn" @click="applyText">
              Edit as grid
            </button>
          </div>
          <template v-if="bulkText !== undefined">
            <label
              >Menu items as text
              <span class="hint"
                >One item per line in Name | Description | Price format. Use \n
                for a line break and \| for a literal separator.</span
              >
              <textarea
                v-model="bulkText"
                class="bulk-text"
                rows="7"
                spellcheck="false"
              />
            </label>
            <p v-if="bulkError" class="data-error" role="alert">
              {{ bulkError }}
            </p>
            <button
              type="button"
              class="text-link"
              @click="
                bulkText = undefined;
                bulkError = '';
              "
            >
              Cancel text edits
            </button>
          </template>
          <div
            v-else
            class="item-table"
            tabindex="0"
            role="region"
            aria-label="Menu item grid"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Description</th>
                  <th scope="col">Price</th>
                  <th
                    v-for="[key, label] in dietaryAttributes"
                    :key="key"
                    scope="col"
                    class="attribute-cell"
                  >
                    {{ label }}
                  </th>
                  <th scope="col" class="item-remove-cell">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(_, index) in group.items.length + spareRows"
                  :key="index"
                  :class="{ spare: index >= group.items.length }"
                >
                  <td data-column="Name">
                    <input
                      :value="group.items[index]?.name"
                      maxlength="120"
                      :aria-label="`Item ${index + 1} name`"
                      @input="
                        editItem(index, {
                          name: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                  </td>
                  <td data-column="Description">
                    <textarea
                      :value="group.items[index]?.description"
                      rows="1"
                      maxlength="500"
                      :aria-label="`Item ${index + 1} description`"
                      @input="
                        editItem(index, {
                          description: ($event.target as HTMLTextAreaElement)
                            .value,
                        })
                      "
                    />
                  </td>
                  <td data-column="Price">
                    <input
                      :value="group.items[index]?.price"
                      inputmode="decimal"
                      :aria-label="`Item ${index + 1} price`"
                      @input="
                        editItem(index, {
                          price: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                  </td>
                  <td
                    v-for="[key, label] in dietaryAttributes"
                    :key="key"
                    class="attribute-cell"
                  >
                    <label>
                      <input
                        type="checkbox"
                        :checked="group.items[index]?.attributes.includes(key)"
                        :aria-label="`Item ${index + 1} ${label}`"
                        @change="
                          toggleAttribute(
                            index,
                            key,
                            ($event.target as HTMLInputElement).checked,
                          )
                        "
                      />
                      <span>{{ label }}</span>
                    </label>
                  </td>
                  <td class="item-remove-cell">
                    <div class="item-action-buttons">
                      <button
                        v-if="group.items[index] && hasItem(group.items[index])"
                        type="button"
                        class="item-details-button"
                        :class="{
                          'has-details':
                            detailsSummary(group.items[index]) !== 'Details',
                        }"
                        :title="detailsSummary(group.items[index])"
                        :aria-description="detailsSummary(group.items[index])"
                        :aria-label="`Details for ${group.items[index].name || 'item ' + (index + 1)}`"
                        @click="detailsIndex = index"
                      >
                        <AppIcon name="more" />
                        <span>{{ detailsSummary(group.items[index]) }}</span>
                      </button>
                      <button
                        v-if="group.items[index] && hasItem(group.items[index])"
                        type="button"
                        class="remove"
                        :aria-label="`Remove item ${group.items[index].name || index + 1}`"
                        @click="group.items.splice(index, 1)"
                      >
                        <AppIcon name="close" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button"
            class="text-link delete-group"
            @click="removeGroup"
          >
            Delete group
          </button>
        </div>
        <p v-else class="hint empty-group">
          Add a group to start building your menu.
        </p>
      </div>
    </fieldset>
  </form>
  <MenuItemDetails
    v-if="detailsItem && detailsIndex !== undefined"
    :item="detailsItem"
    @apply="editItem(detailsIndex, $event)"
    @close="detailsIndex = undefined"
  />
</template>

<style scoped>
.data-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.data-tabs a {
  margin-bottom: -1px;
  padding: 10px 2px;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-weight: 600;
}
.data-tabs a:hover,
.data-tabs a[aria-current="page"] {
  color: var(--wine);
}
.data-tabs a[aria-current="page"] {
  border-bottom-color: var(--wine);
}
.data-section {
  min-width: 0;
  margin: 0 0 24px;
  padding: 0;
  border: 0;
}
.data-section > legend {
  margin-bottom: 18px;
  padding: 0;
  font: 24px var(--serif);
}
h2 {
  margin: 0;
  font-size: 16px;
}
label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}
input:not([type="checkbox"]),
textarea {
  width: 100%;
  min-width: 0;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-weight: 400;
}
textarea {
  resize: vertical;
}
textarea:focus {
  outline: 2px solid #d9ac94;
}
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}
.data-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 22px 0 12px;
}
.data-heading p,
.hint {
  margin: 4px 0 8px;
  color: var(--muted);
  font-weight: 400;
}
.custom-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
  align-items: end;
  gap: 12px;
  margin: 10px 0;
}
.menu-section {
  container-type: inline-size;
}
.menu-grid {
  display: grid;
  grid-template-columns: minmax(140px, 18%) minmax(0, 1fr);
  gap: 22px;
}
.groups {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.groups button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  border-radius: 8px;
  padding: 9px 12px;
}
.groups button span:first-child {
  overflow-wrap: anywhere;
}
.groups button[aria-pressed="true"] {
  color: var(--wine);
  background: #f7e9ed;
  font-weight: 700;
}
.groups .btn {
  justify-content: center;
}
.item-table {
  overflow: auto;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
}
table {
  width: 100%;
  min-width: 700px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}
th,
td {
  text-align: left;
  padding: 0;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
}
th {
  padding: 8px 6px;
  background: #f8f1e9;
  font-size: 12px;
}
tr:last-child td {
  border-bottom: 0;
}
th:nth-last-child(2),
td:nth-last-child(2),
th:last-child,
td:last-child {
  border-right: 0;
}
th:first-child {
  width: 22%;
}
th:nth-child(3) {
  width: 68px;
}
th:last-child {
  width: 132px;
}
th.attribute-cell {
  width: 54px;
  padding-inline: 4px;
}
th.attribute-cell:nth-child(5) {
  width: 75px;
}
.attribute-cell {
  text-align: center;
}
.attribute-cell label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.attribute-cell input {
  margin: 0;
  accent-color: var(--wine);
}
.attribute-cell span {
  display: none;
}
.item-table td > input,
.item-table td > textarea {
  display: block;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 8px;
}
.item-table td > textarea {
  field-sizing: content;
  min-height: 36px;
  max-height: 96px;
}
@supports (field-sizing: content) {
  .item-table td > textarea {
    resize: none;
  }
}
.item-table td > :focus {
  outline-offset: -2px;
}
.item-action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 36px;
}
.item-details-button {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
  height: 36px;
  padding: 0 4px 0 8px;
  color: var(--wine);
  font-size: 11px;
  text-align: left;
}
.item-details-button span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.item-details-button svg {
  width: 14px;
  height: 14px;
}
.item-details-button:hover {
  text-decoration: underline;
}
.item-remove-cell {
  position: sticky;
  right: 0;
  z-index: 1;
  text-align: center;
  vertical-align: middle;
  border-left: 1px solid var(--line);
}
td.item-remove-cell {
  background: white;
}
.item-remove-cell .remove {
  display: inline-grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
}
.item-action-buttons button:focus-visible {
  outline-offset: -2px;
}
.remove {
  padding: 8px;
  color: var(--wine);
}
.delete-group {
  display: block;
  margin-top: 14px;
  color: var(--wine);
}
.bulk-text {
  font-family: monospace;
}
.data-error {
  color: var(--wine);
  margin-bottom: 12px;
}
.save-status {
  color: #365941;
}
@container (max-width: 900px) {
  .menu-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .groups {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
@container (max-width: 900px) {
  th:last-child {
    width: 73px;
  }
  .item-details-button {
    justify-content: center;
    padding: 0;
  }
  .item-details-button span {
    display: none;
  }
  .item-details-button.has-details::after {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    content: "";
  }
}
@container (min-width: 561px) and (max-width: 900px) {
  table {
    min-width: 0;
  }
  th:first-child {
    width: 19%;
  }
  th:nth-child(3) {
    width: 54px;
  }
  th.attribute-cell {
    width: 43px;
    padding-inline: 3px;
    font-size: 11px;
  }
  th.attribute-cell:nth-child(5) {
    width: 66px;
  }
}
@media (max-width: 690px) {
  .details-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@container (max-width: 560px) {
  .details-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .data-heading {
    flex-wrap: wrap;
  }
  table,
  tbody {
    display: block;
    min-width: 0;
  }
  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  tr {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(68px, 1fr) 72px;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 0;
    border: 0;
  }
  td[data-column]::before {
    display: block;
    margin-bottom: 4px;
    content: attr(data-column);
    font-size: 12px;
    font-weight: 600;
  }
  td:first-child {
    grid-column: span 3;
  }
  td:nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  td.attribute-cell {
    grid-column: span 2;
    text-align: left;
  }
  .attribute-cell label {
    justify-content: start;
    gap: 5px;
    min-height: 26px;
    font-size: 12px;
  }
  .attribute-cell span {
    display: inline;
  }
  .item-table td > input,
  .item-table td > textarea {
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  td.item-remove-cell {
    position: static;
    grid-column: 5;
    grid-row: 1;
    align-self: start;
    margin-top: 20px;
    border-left: 0;
  }
  .spare ~ .spare {
    display: none;
  }
}
</style>
