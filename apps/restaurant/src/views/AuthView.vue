<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MenuPreview } from "@sizzle/ui";
import { GoApiError, fixtures } from "@sizzle/api-client";
import { authApi, isLiveAuth } from "../auth";
const brandTemplates = fixtures.templates.filter(template => ["after", "sunday"].includes(template.id));
const route = useRoute();
const router = useRouter();
const registering = computed(() => route.name === "register");
const email = ref("");
const password = ref("");
const visible = ref(false);
const pending = ref(false);
const message = ref("");
const error = ref(false);
const info = ref<HTMLDialogElement | null>(null);
const infoTitle = ref("");
const infoCopy = ref("");
watch(() => route.name, () => {
  password.value = "";
  visible.value = false;
  message.value = "";
  error.value = false;
});
function showInfo(kind: string) {
  const content: Record<string, [string, string]> = {
    reset: ["A fresh start.", "Password reset is not available yet. Please contact your Sizzle administrator for help accessing your account."],
    privacy: ["Your privacy matters.", "In API mode, credentials are sent to your configured Sizzle server to establish a cookie session. This page does not store your password. A full privacy policy will be available before launch."],
    terms: ["A little housekeeping.", "Sizzle’s service terms will be available before launch. For account questions, contact your Sizzle administrator."],
    help: ["Let’s keep your spark going.", "Contact your Sizzle administrator for help with your account. You can also explore the demo workspace without creating an account."],
  };
  [infoTitle.value, infoCopy.value] = content[kind] || content.help!;
  info.value?.showModal();
}
async function submit() {
  if (pending.value) return;
  message.value = "";
  error.value = false;
  if (!isLiveAuth) {
    message.value = "This is the demo experience. No account was created or signed in. Explore the demo workspace below, or configure API authentication to use your account.";
    return;
  }
  if (registering.value) {
    const bytes = new TextEncoder().encode(password.value).length;
    if (bytes < 8 || bytes > 72) {
      error.value = true;
      message.value = "Choose a password between 8 and 72 bytes.";
      return;
    }
  }
  pending.value = true;
  try {
    await authApi.auth[registering.value ? "register" : "login"](email.value.trim(), password.value);
    password.value = "";
    await router.replace("/dashboard");
  } catch (cause) {
    error.value = true;
    const status = cause instanceof GoApiError ? cause.status : 0;
    message.value = status === 401 ? "That email and password don’t match. Please try again."
      : status === 409 ? "We couldn’t create this account. Try signing in or use another email address."
      : status === 400 ? "Check your email address and password, then try again."
      : "We couldn’t reach sign-in right now. Please try again shortly.";
  } finally {
    pending.value = false;
  }
}
function google() {
  if (isLiveAuth) window.location.assign(authApi.auth.googleUrl);
  else { error.value = false; message.value = "Google sign-in is available when API authentication is connected. You can explore the demo workspace below."; }
}
</script>
<template>
<main :class="['auth-page', 'page', { register: registering }]">

<section class="brand" aria-label="Sizzle inspiration">
<RouterLink class="logo" to="/login" aria-label="Sizzle home"><img src="/assets/sizzle-logo.svg" alt="Sizzle"><small>YOUR CREATIVE KITCHEN</small></RouterLink>
<div class="eyebrow">YOUR CREATIVE HOME</div>
<h1>Good things.<br><em>On your menu.</em></h1>
<p class="brand-copy">Thoughtfully designed templates.<br>A little of your restaurant’s personality.</p>
<div class="art" aria-hidden="true"><MenuPreview v-for="template in brandTemplates" :key="template.id" :template="template" /></div>
<div class="brand-foot"><span class="little-spark"><span>✳</span> Made for a little more you.</span><span>SIZZLE STUDIO ↗</span></div>
</section>
<section class="form-side">
<div class="account-header"><RouterLink class="compact-logo" to="/login" aria-label="Sizzle home"><img src="/assets/sizzle-logo.svg" alt="Sizzle"></RouterLink><nav class="top-nav" aria-label="Account navigation"><span>{{ registering ? 'Already part of the spark?' : 'New around here?' }}</span><RouterLink class="nav-button" :to="registering ? '/login' : '/register'">{{ registering ? 'Sign in ↗' : 'Create an account ↗' }}</RouterLink></nav></div>
<div class="form-wrap">
<h2>{{ registering ? 'Your next chapter starts here.' : 'Good to see you again.' }}</h2>
<p class="intro">{{ registering ? 'Your restaurant’s creative home. Make it yours.' : 'Your next great menu is waiting. Let’s pick up where you left off.' }}</p>
<button class="social" :disabled="pending" @click="google"><span class="google" aria-hidden="true">G</span>Continue with Google</button>
<div class="divider">or continue with email</div>
<form @submit.prevent="submit" :aria-busy="pending">
<fieldset :disabled="pending" class="auth-fields">
<div class="field"><label for="email">Email address</label><input id="email" v-model="email" name="emailAddress" type="email" placeholder="you@example.com" required autocomplete="username"></div>
<div class="field"><label for="password">Password</label><div class="input-box"><input id="password" v-model="password" name="password" class="password" :type="visible ? 'text' : 'password'" :placeholder="registering ? 'Create a password' : 'Enter your password'" required :minlength="registering ? 8 : undefined" :autocomplete="registering ? 'new-password' : 'current-password'" :aria-describedby="registering ? 'password-hint' : undefined"><button class="eye" type="button" :aria-label="visible ? 'Hide password' : 'Show password'" :aria-pressed="visible" @click="visible = !visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div><p v-if="registering" class="password-hint" id="password-hint">Use at least 8 characters (up to 72 bytes).</p></div>
<div v-if="!registering" class="options"><span>Something good is on the menu.</span><button type="button" class="text-link" @click="showInfo('reset')">Forgot password?</button></div>
<button class="submit" type="submit"><span class="submit-label">{{ pending ? 'Just a moment…' : registering ? 'Create your account' : 'Sign in' }}</span><span aria-hidden="true">→</span></button>
</fieldset>
<p v-if="registering" class="terms">By creating an account, you agree to our <button type="button" @click="showInfo('terms')">Terms</button><br>and acknowledge our <button type="button" @click="showInfo('privacy')">Privacy Policy</button>.</p>
<p v-if="message" class="status" :class="{ 'auth-error': error }" :role="error ? 'alert' : 'status'">{{ message }}</p>
</form>
<p class="switch-copy">{{ registering ? 'Already have an account?' : 'Don’t have an account?' }} <RouterLink class="text-link" :to="registering ? '/login' : '/register'">{{ registering ? 'Sign in ↗' : 'Sign up for free ↗' }}</RouterLink></p>
<p v-if="!isLiveAuth" class="switch-copy"><RouterLink class="text-link" to="/dashboard">Explore the demo workspace →</RouterLink></p>
</div>
<footer class="form-foot"><span>© {{ new Date().getFullYear() }} Sizzle Studio. Made for a little more you.</span><div class="foot-links"><button @click="showInfo('privacy')">Privacy</button><button @click="showInfo('terms')">Terms</button><button @click="showInfo('help')">Get help ↗</button></div></footer>
</section>
<dialog ref="info" aria-labelledby="info-title"><h3 id="info-title">{{ infoTitle }}</h3><p>{{ infoCopy }}</p><button class="submit" @click="info?.close()">Got it</button></dialog>
</main>
</template>
<style scoped src="../assets/auth.css"></style>
<style scoped>
.auth-page { min-width:0; }
.auth-fields { border:0; padding:0; margin:0; min-width:0; }
.auth-page svg { stroke:none; stroke-width:0; flex-shrink:0; }
.auth-page .eye svg { stroke:currentColor; stroke-width:1.5; }
.auth-page .submit-label { font-size:12px; }
.auth-page button:disabled { opacity:.6; cursor:wait; }
.auth-page .auth-error { background:#fbe9e2; color:#923b27; }
.auth-page .brand { padding-bottom:30px; }
.auth-page .brand h1 { color:#722345; }
</style>
