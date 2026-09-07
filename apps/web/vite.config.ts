import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One .env at the repository root, shared with the API, rather than one per
  // application. Without this Vite would only read apps/web/.env.
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
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
