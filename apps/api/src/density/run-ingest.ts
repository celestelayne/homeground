import { refreshComparisons, registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestDensityGrid } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:density`.
 *
 * See docs/milestones.md — ingestion is a command, not a schedule.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);

try {
  await registerSources(db);
  const total = await ingestDensityGrid(db);
  console.log(`Classified ${total} communes from INSEE's density grid.`);
  const refreshed = await refreshComparisons(db);
  console.log(`Recomputed comparisons for ${refreshed} communes already held.`);
} finally {
  await pool.end();
}
