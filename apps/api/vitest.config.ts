import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    // Integration tests share one database from M1 step 2 onward, so test
    // files must not run in parallel against it.
    fileParallelism: false,
  },
});
