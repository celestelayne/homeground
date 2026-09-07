import { registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestFiness } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:finess`.
 *
 * Ingestion is a command rather than a schedule until a milestone needs it to
 * be automatic. See docs/milestones.md.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);

try {
  await registerSources(db);
  const total = await ingestFiness(db);
  console.log(`Ingested ${total} health facilities from FINESS.`);
} finally {
  await pool.end();
}
