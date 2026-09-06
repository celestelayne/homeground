import path from "node:path";
import { loadEnvFile } from "node:process";
import { createDb } from "../db/client.js";

const REPOSITORY_ENV = path.resolve(import.meta.dirname, "../../../../.env");

export function loadTestEnv(): void {
  try {
    loadEnvFile(REPOSITORY_ENV);
  } catch {
    // CI supplies DATABASE_URL directly.
  }
}

/**
 * Tests run against a sibling database so a local development database is
 * never truncated.
 */
export function testDatabaseUrl(): string {
  loadTestEnv();

  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to run API tests");
  }

  const parsed = new URL(url);
  parsed.pathname = `/${parsed.pathname.replace(/^\//, "")}_test`;

  return parsed.toString();
}

let shared: ReturnType<typeof createDb> | undefined;

export function getTestDb() {
  shared ??= createDb(testDatabaseUrl());

  return shared;
}
