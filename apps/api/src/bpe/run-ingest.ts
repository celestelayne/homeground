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
  const total = await ingestBpe(db);
  console.log(`Ingested ${total} commune facility counts from BPE.`);
} finally {
  await pool.end();
}
