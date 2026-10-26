<script setup lang="ts">
import { computed, watch } from "vue";
import { useForm, useField } from "vee-validate";
import { designNameSchema } from "@sizzle/schemas";
import { AppDialog, AppIcon, MenuPreview } from "@sizzle/ui";
import { useDesignActions } from "../composables/useDesignActions";
const { ui, data, useTemplate } = useDesignActions();
const { handleSubmit, resetForm } = useForm<{ name: string }>();
const { value: name, errorMessage } = useField<string>("name", (value) => {
  const result = designNameSchema.safeParse(value);
  return result.success || result.error.issues[0]?.message || "Invalid name.";
});
watch(
  () => ui.renameDesign,
  (design) => {
    if (design) resetForm({ values: { name: design.name } });
  },
);
const saveName = handleSubmit(async (values) => {
  if (!ui.renameDesign) return;
  try {
    await data.rename.mutateAsync({
      id: ui.renameDesign.id,
      name: values.name,
    });
    ui.renameDesign = null;
    ui.notify("Design renamed.");
  } catch {
    /* Keep the form open; mutation error is displayed in the toast. */
  }
});
const designTemplate = computed(() =>
  data.templates.data.value?.find((t) => t.id === ui.previewDesign?.template),
);
async function confirmDelete() {
  const design = ui.deleteDesign;
  if (!design) return;
  try {
    await data.remove.mutateAsync(design.id);
    ui.deleteDesign = null;
    ui.lastDeleted = design;
    ui.notify("Design deleted.");
  } catch {
    /* Keep the dialog open for retry. */
  }
}
</script>
<template>
  <AppDialog
    :open="!!ui.previewTemplate"
    :title="ui.previewTemplate?.name || 'Template preview'"
    :description="ui.previewTemplate?.tag"
    large
    @update:open="!$event && (ui.previewTemplate = null)"
  >
    <template #eyebrow
      ><div class="eyebrow">
        {{ ui.previewTemplate?.style }} · {{ ui.previewTemplate?.type }}
      </div></template
    >
    <div class="editor-preview">
      <MenuPreview v-if="ui.previewTemplate" :template="ui.previewTemplate" />
    </div>
    <div class="preview-footer">
      <div class="preview-specs">
        <span>A4 portrait</span><span>Fully customisable</span>
      </div>
      <div class="modal-actions">
        <button class="btn" @click="ui.previewTemplate = null">
          Keep exploring</button
        ><button
          class="btn primary"
          :disabled="data.create.isPending.value"
          @click="ui.previewTemplate && useTemplate(ui.previewTemplate)"
        >
          Use this template <AppIcon name="arrow" />
        </button>
      </div>
    </div>
  </AppDialog>
  <AppDialog
    :open="!!ui.previewDesign"
    :title="ui.previewDesign?.name || 'Design preview'"
    description="A closer look at your design."
    large
    @update:open="!$event && (ui.previewDesign = null)"
  >
    <template #eyebrow
      ><div class="eyebrow">
        YOUR DESIGN · {{ ui.previewDesign?.type }}
      </div></template
    >
    <div class="editor-preview">
      <div id="live-menu">
        <MenuPreview
          v-if="designTemplate"
          :template="designTemplate"
          :title="ui.previewDesign?.menuTitle"
        />
      </div>
    </div>
    <div class="preview-footer">
      <div class="preview-specs">
        <span>A4 portrait</span
        ><span
          >{{ ui.previewDesign?.pages }}
          {{ ui.previewDesign?.pages === 1 ? "page" : "pages" }}</span
        ><span>{{ ui.previewDesign?.status }}</span>
      </div>
      <div class="modal-actions">
        <button class="btn primary" @click="ui.previewDesign = null">
          Done <AppIcon name="check" />
        </button>
      </div>
    </div>
  </AppDialog>
  <AppDialog
    :open="!!ui.renameDesign"
    title="A new name. Same good taste."
    @update:open="!$event && (ui.renameDesign = null)"
    ><form @submit="saveName">
      <label for="design-name">Design name</label
      ><input
        id="design-name"
        v-model="name"
        maxlength="80"
        :aria-invalid="!!errorMessage"
        aria-describedby="name-error"
        autocomplete="off"
      />
      <div v-if="errorMessage" id="name-error" class="validation-error">
        {{ errorMessage }}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="ui.renameDesign = null">
          Cancel</button
        ><button class="btn primary" :disabled="data.rename.isPending.value">
          Save name
        </button>
      </div>
    </form></AppDialog
  >
  <AppDialog
    :open="!!ui.deleteDesign"
    title="Remove this design?"
    :description="`“${ui.deleteDesign?.name || ''}” will be removed from this workspace. You can undo this until you leave the page.`"
    @update:open="!$event && (ui.deleteDesign = null)"
    ><div class="modal-actions">
      <button class="btn" @click="ui.deleteDesign = null">Keep design</button
      ><button
        class="btn danger"
        :disabled="data.remove.isPending.value"
        @click="confirmDelete"
      >
        Delete design
      </button>
    </div></AppDialog
  >
  <AppDialog
    :open="ui.helpOpen"
    title="A little guidance, on the house."
    @update:open="ui.helpOpen = $event"
    ><template #eyebrow><div class="eyebrow">THE HELP KITCHEN</div></template>
    <p>
      <strong>Start designing</strong><br />Choose a template, then select “Use
      this template” to create your own copy.
    </p>
    <p>
      <strong>Keep things fresh</strong><br />Open a design for a closer look.
      Use the options menu to rename, duplicate, or delete it.
    </p>
    <p>
      <strong>Your brand, together</strong><br />Upload logos and images in My
      assets.
    </p>
    <p>
      <strong>Print orders</strong><br />Open an order to see its progress and
      print specifications. Orders in the demo are examples.
    </p>
    <div class="modal-actions">
      <button class="btn primary" @click="ui.helpOpen = false">Got it</button>
    </div></AppDialog
  >
  <AppDialog
    :open="ui.notificationsOpen"
    title="Fresh from the studio"
    @update:open="ui.notificationsOpen = $event"
    ><p>
      <strong>Your autumn menus are in production.</strong><br />Order #SZ-2048
      · Estimated arrival October 28–30.
    </p>
    <div class="modal-actions">
      <button class="btn" @click="ui.notificationsOpen = false">Close</button
      ><RouterLink
        class="btn primary"
        to="/orders/SZ-2048"
        @click="ui.notificationsOpen = false"
        >View order</RouterLink
      >
    </div></AppDialog
  >
</template>
