import { refreshWeather, registerSources } from "../areas/store.js";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import { ingestWeather, recentYears } from "./ingest.js";

/**
 * Run by hand: `pnpm --filter @homeground/api run ingest:weather`.
 *
 * Downloads around 140 MB across a hundred-odd département files and keeps the
 * recent years of each. See docs/milestones.md — ingestion is a command.
 */
const env = readEnv();
const { db, pool } = createDb(env.databaseUrl);
const window = recentYears();

try {
  await registerSources(db);
  console.log(`Ingesting ${window.from}–${window.to}…`);
  const { stations, records, files } = await ingestWeather(db, globalThis.fetch, window);
  console.log(`Ingested ${records} monthly records from ${stations} stations, ${files} files.`);
  const refreshed = await refreshWeather(db);
  console.log(`Recomputed weather for ${refreshed} communes already held.`);
} finally {
  await pool.end();
}
