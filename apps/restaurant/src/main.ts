import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { router } from "./router";
import App from "./App.vue";
import "./assets/tailwind.css";
import "./assets/design.css";
import "./assets/vue.css";
createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, {
    queryClientConfig: {
      defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    },
  })
  .use(router)
  .mount("#app");
