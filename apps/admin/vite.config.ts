import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  publicDir: "../restaurant/public",
  server: { port: 4174 },
  preview: { port: 4174 },
});
