import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import SearchView from "./SearchView.vue";
import "../../restaurant/src/assets/design.css";
import "../../restaurant/src/assets/vue.css";
import "./admin.css";
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, savedPosition) => savedPosition || { top: 0 },
  routes: [
    { path: "/", redirect: "/templates" },
    ...["templates", "designs", "users", "orders"].map((kind) => ({
      path: `/${kind}`, name: kind, component: SearchView, props: { kind },
    })),
    { path: "/orders/:id", name: "order-details", component: () => import("./OrderDetailsView.vue") },
    { path: "/:pathMatch(.*)*", component: () => import("./NotFound.vue") },
  ],
});
router.afterEach((to) => { document.title = `${String(to.name || "Administrator")} — Sizzle Admin`; });
createApp(App).use(router).use(VueQueryPlugin, {
  queryClientConfig: { defaultOptions: { queries: { staleTime: 30_000, gcTime: 60_000, retry: false, refetchOnWindowFocus: false } } },
}).mount("#app");
