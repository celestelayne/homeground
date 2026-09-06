import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { createDb } from "../db/client.js";
import { testDatabaseUrl } from "./database.js";

/**
 * Creates the test database if absent, then brings it up to date using the
 * same committed migrations CI and development replay. The schema is never
 * built by a second code path.
 */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  const name = new URL(url).pathname.replace(/^\//, "");

  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";

  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();

  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);

  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${name}"`);
  }

  await client.end();

  const { db, pool } = createDb(url);
  await migrate(db, {
    migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle"),
  });
  await pool.end();
}
