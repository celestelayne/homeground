import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre spawns a web worker to parse styles and tiles. Vite's dependency
    // pre-bundling rewrites that worker construction and it never spawns, so
    // the map renders a canvas, loads nothing, and reports no error.
    exclude: ["maplibre-gl"],
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
