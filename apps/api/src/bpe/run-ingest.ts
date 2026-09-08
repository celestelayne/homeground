import { refreshComparisons, registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestBpe } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:bpe`.
 *
 * Ingestion is a command rather than a schedule until a milestone needs it to
 * be automatic. See docs/milestones.md.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);

try {
  await registerSources(db);
  const total = await ingestBpe(db);
  console.log(`Ingested ${total} commune facility counts from BPE.`);
  const refreshed = await refreshComparisons(db);
  console.log(`Recomputed comparisons for ${refreshed} communes already held.`);
} finally {
  await pool.end();
}
