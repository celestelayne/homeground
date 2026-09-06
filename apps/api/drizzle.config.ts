import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

// The repository-root .env is optional: CI supplies DATABASE_URL directly.
try {
  loadEnvFile("../../.env");
} catch {
  // No local .env file.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
