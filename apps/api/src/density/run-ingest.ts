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
  const total = await ingestDensityGrid(db);
  console.log(`Classified ${total} communes from INSEE's density grid.`);
} finally {
  await pool.end();
}
