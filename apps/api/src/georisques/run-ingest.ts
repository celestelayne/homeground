import { refreshExposure, registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestGeorisques } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:georisques`.
 *
 * See docs/milestones.md — ingestion is a command, not a schedule.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);

try {
  await registerSources(db);
  const { designations, disasters, radon } = await ingestGeorisques(db);
  console.log(
    `Ingested ${designations} designations, ${disasters} disaster declarations, ` +
      `${radon} radon classes.`,
  );
  const refreshed = await refreshExposure(db);
  console.log(`Recomputed exposure for ${refreshed} communes already held.`);
} finally {
  await pool.end();
}
