import { refreshComparisons, registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestZoning } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:zoning`.
 *
 * See docs/milestones.md — ingestion is a command, not a schedule.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);

try {
  await registerSources(db);
  const total = await ingestZoning(db);
  console.log(`Ingested ${total} health zoning designations.`);
  const refreshed = await refreshComparisons(db);
  console.log(`Recomputed evidence for ${refreshed} communes already held.`);
} finally {
  await pool.end();
}
