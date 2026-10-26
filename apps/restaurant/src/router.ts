import { createRouter, createWebHistory } from "vue-router";
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", redirect: "/dashboard" },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("./views/DashboardView.vue"),
      meta: { title: "Overview" },
    },
    {
      path: "/templates",
      name: "templates",
      component: () => import("./views/TemplatesView.vue"),
      meta: { title: "Templates" },
    },
    {
      path: "/designs",
      name: "designs",
      component: () => import("./views/DesignsView.vue"),
      meta: { title: "My designs" },
    },
    {
      path: "/assets",
      name: "assets",
      component: () => import("./views/AssetsView.vue"),
      meta: { title: "My assets" },
    },
    {
      path: "/orders",
      name: "orders",
      component: () => import("./views/OrdersView.vue"),
      meta: { title: "Print orders" },
    },
    {
      path: "/orders/:id",
      name: "order",
      component: () => import("./views/OrderDetailView.vue"),
      meta: { title: "Order details" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./views/NotFoundView.vue"),
      meta: { title: "Page not found" },
    },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title || "Workspace"} — Sizzle Studio`;
});
