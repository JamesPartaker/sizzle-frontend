<script setup lang="ts">
import { computed } from "vue";
import { AppIcon, MenuPreview } from "@sizzle/ui";
import PageHeading from "../components/PageHeading.vue";
import PageFooter from "../components/PageFooter.vue";
import TemplateCard from "../components/TemplateCard.vue";
import DesignCard from "../components/DesignCard.vue";
import QueryState from "../components/QueryState.vue";
import { useWorkspaceData } from "../composables/useWorkspaceData";
const { designs, templates } = useWorkspaceData();
const recent = computed(() =>
  [...(designs.data.value || [])]
    .sort((a, b) => b.edited - a.edited)
    .slice(0, 3),
);
const template = (id: string) => templates.data.value?.find((t) => t.id === id);
</script>
<template>
  <PageHeading
    eyebrow="YOUR CREATIVE HOME"
    title="Good things on the menu."
    description="A fresh idea, a quick update, or your next great first impression."
    ><RouterLink class="btn primary" to="/templates"
      ><AppIcon name="plus" />New design</RouterLink
    ></PageHeading
  >
  <section class="hero">
    <div class="hero-copy">
      <div class="eyebrow">A NEW SEASON. A FRESH START.</div>
      <h2>Your next menu.<br /><em>Already looking good.</em></h2>
      <p>Thoughtfully designed templates. A little of your personality.</p>
      <RouterLink class="btn wine" to="/templates"
        >Find your starting point <AppIcon name="arrow"
      /></RouterLink>
    </div>
    <div class="hero-art" aria-hidden="true">
      <MenuPreview
        v-if="template('after')"
        :template="template('after')!"
      /><MenuPreview
        v-if="template('sunday')"
        :template="template('sunday')!"
      />
    </div>
  </section>
  <section>
    <div class="section-head">
      <div>
        <h2>Pick up where you left off</h2>
        <div class="subtitle">
          Your most recent creations, ready for a little more you.
        </div>
      </div>
      <RouterLink to="/designs" class="text-link"
        >All designs <AppIcon name="arrow"
      /></RouterLink>
    </div>
    <QueryState
      :loading="designs.isPending.value"
      :error="designs.error.value"
      @retry="designs.refetch()"
      ><div class="recent-grid">
        <DesignCard
          v-for="design in recent"
          :key="design.id"
          :design="design"
          :template="template(design.template)"
        />
        <div v-if="!recent.length" class="empty">
          Your first design starts with a template below.
        </div>
      </div></QueryState
    >
  </section>
  <section>
    <div class="section-head">
      <div>
        <h2>A little inspiration, on the house.</h2>
        <div class="subtitle">
          Find a look that feels like your place. Make it yours.
        </div>
      </div>
      <RouterLink to="/templates" class="text-link"
        >Explore templates <AppIcon name="arrow"
      /></RouterLink>
    </div>
    <QueryState
      :loading="templates.isPending.value"
      :error="templates.error.value"
      @retry="templates.refetch()"
      ><div class="template-grid">
        <TemplateCard
          v-for="t in templates.data.value?.slice(0, 4)"
          :key="t.id"
          :template="t"
        /></div
    ></QueryState>
  </section>
  <PageFooter />
</template>
