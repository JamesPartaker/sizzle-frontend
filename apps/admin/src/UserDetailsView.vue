<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
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
  queryKey: computed(() => ["admin", "user-details", id.value]),
  queryFn: ({ signal }) => adminRepository.getUser(id.value, signal),
});
const user = query.data;
const form = reactive({ name: "", email: "", restaurant: "", status: "" });
const validation = ref("");
const notice = ref("");
function resetForm() {
  if (user.value) Object.assign(form, { name: user.value.name, email: user.value.email, restaurant: user.value.restaurant, status: user.value.status });
  validation.value = "";
}
watch(user, resetForm, { immediate: true });
const dirty = computed(() => !!user.value && (form.name.trim() !== user.value.name || form.email.trim() !== user.value.email || form.restaurant.trim() !== user.value.restaurant || form.status !== user.value.status));
const save = useMutation({
  mutationFn: (details: typeof form) => adminRepository.updateUser(id.value, details),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "users"] }),
      client.invalidateQueries({ queryKey: ["admin", "user-details", id.value] }),
    ]);
    notice.value = "User details saved.";
  },
});
function submit() {
  validation.value = "";
  notice.value = "";
  if (!form.name.trim() || !form.restaurant.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    validation.value = "Enter a name, restaurant, and valid email address.";
    return;
  }
  save.mutate({ name: form.name.trim(), email: form.email.trim(), restaurant: form.restaurant.trim(), status: form.status });
}
const date = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
</script>
<template>
  <RouterLink class="back" to="/users"><AppIcon name="back" />Back to all users</RouterLink>
  <div v-if="query.isPending.value" class="empty" role="status">Loading user details…</div>
  <div v-else-if="query.isError.value" class="page-error" role="alert">Couldn’t load this user. <button class="btn" @click="query.refetch()">Try again</button></div>
  <template v-else-if="user">
    <PageHeading eyebrow="THE PEOPLE BEHIND THE MENUS" :title="user.name" :description="`${user.id} · ${user.restaurant}`"><span :class="['badge', { orange: user.status === 'Invited', gray: user.status === 'Suspended' }]">{{ user.status }}</span></PageHeading>
    <div v-if="notice" class="admin-notice" role="status">{{ notice }}</div>
    <div class="detail-grid admin-record-details">
      <div>
        <section class="panel"><h2>User overview</h2><dl class="admin-detail-list"><div><dt>User ID</dt><dd>{{ user.id }}</dd></div><div><dt>Full name</dt><dd>{{ user.name }}</dd></div><div><dt>Email</dt><dd><a :href="`mailto:${user.email}`">{{ user.email }}</a></dd></div><div><dt>Restaurant</dt><dd>{{ user.restaurant }}</dd></div></dl></section>
        <section class="panel"><h2>Account details</h2><dl class="admin-detail-list"><div><dt>Account status</dt><dd>{{ user.status }}</dd></div><div><dt>Role</dt><dd>{{ user.role }}</dd></div><div><dt>Created</dt><dd>{{ date(user.createdAt) }}</dd></div><div><dt>Last updated</dt><dd>{{ date(user.updatedAt) }}</dd></div><div><dt>Last sign-in</dt><dd>{{ user.lastSignInAt ? date(user.lastSignInAt) : 'Not signed in yet' }}</dd></div></dl></section>
      </div>
      <section class="panel admin-user-edit"><h2>Update user details</h2>
        <form class="admin-form" @submit.prevent="submit"><fieldset :disabled="save.isPending.value">
          <label for="user-name">Full name</label><input id="user-name" v-model="form.name" required maxlength="100" autocomplete="name" />
          <label for="user-email">Email address</label><input id="user-email" v-model="form.email" type="email" required maxlength="254" autocomplete="email" />
          <label for="user-restaurant">Restaurant</label><input id="user-restaurant" v-model="form.restaurant" required maxlength="160" autocomplete="organization" />
          <label for="user-status">Account status</label><select id="user-status" v-model="form.status"><option v-for="status in statuses.users" :key="status">{{ status }}</option></select>
          <p v-if="validation || save.isError.value" class="validation-error" role="alert">{{ validation || 'Couldn’t save changes. Please try again.' }}</p>
          <div class="modal-actions"><button type="button" class="btn" :disabled="!dirty" @click="resetForm(); save.reset()">Reset</button><button type="submit" class="btn primary" :disabled="!dirty">{{ save.isPending.value ? 'Saving…' : 'Save changes' }}</button></div>
        </fieldset></form>
      </section>
    </div>
  </template>
  <section v-else class="empty"><h1>User not found.</h1><p>This user does not exist or is no longer available.</p><RouterLink class="btn" to="/users">Return to all users</RouterLink></section>
  <PageFooter />
</template>
