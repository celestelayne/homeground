import { gunzipSync } from "node:zlib";
import type { Db } from "../db/client.js";
import { weatherMonthly, weatherStations } from "../db/schema.js";
import { parseWeather } from "./parse.js";

/**
 * Météo-France publishes one file per département, and HomeGround keeps the
 * recent years of all of them: a distribution is not needed here, but national
 * coverage is, because a commune's nearest station does not respect a
 * département boundary.
 *
 * Resolved through data.gouv rather than pinned, because the file names carry
 * their publication date.
 */
const DATASET =
  "https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-mensuelles/";
/** The two files per département: everything to last year, then this year. */
const FILE = /MENSQ_([0-9AB]+)_(previous|latest)/;
const BATCH = 5000;

export interface Window {
  from: string;
  to: string;
}

/**
 * The last five complete calendar years, counted from a year that has ended.
 *
 * Complete matters: a five-year figure that quietly includes eight months of
 * the current year is a different number wearing the same label.
 */
export function recentYears(today = new Date()): Window {
  const lastComplete = today.getUTCFullYear() - 1;

  return { from: String(lastComplete - 4), to: String(lastComplete) };
}

export async function ingestWeather(
  db: Db,
  fetchImpl = globalThis.fetch,
  window = recentYears(),
): Promise<{ stations: number; records: number; files: number }> {
  const listing = await fetchImpl(DATASET);

  if (!listing.ok) {
    throw new Error(`Could not read the weather dataset listing: ${listing.status}`);
  }

  const { resources } = (await listing.json()) as { resources: { url: string }[] };
  const files = resources.filter((resource) => FILE.test(resource.url));

  if (files.length === 0) {
    throw new Error("The weather dataset no longer publishes département files");
  }

  const stations = new Map<string, Awaited<ReturnType<typeof parseWeather>>["stations"][number]>();
  const records: Awaited<ReturnType<typeof parseWeather>>["records"] = [];

  for (const file of files) {
    const response = await fetchImpl(file.url);

    if (!response.ok) {
      throw new Error(`Could not download ${file.url}: ${response.status}`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    const csv = file.url.endsWith(".gz")
      ? gunzipSync(body).toString("utf8")
      : body.toString("utf8");
    const parsed = parseWeather(csv, window.from, window.to);

    for (const station of parsed.stations) {
      // A station appears in both of its département's files. Same station.
      stations.set(station.id, station);
    }

    records.push(...parsed.records);
  }

  // Replaced whole, per window. Stations move, close and are renumbered, and a
  // merge would keep a closed station answering for a commune for ever.
  await db.transaction(async (tx) => {
    await tx.delete(weatherMonthly);
    await tx.delete(weatherStations);

    const all = [...stations.values()];

    for (let index = 0; index < all.length; index += BATCH) {
      await tx.insert(weatherStations).values(all.slice(index, index + BATCH));
    }

    for (let index = 0; index < records.length; index += BATCH) {
      await tx.insert(weatherMonthly).values(records.slice(index, index + BATCH));
    }
  });

  return { stations: stations.size, records: records.length, files: files.length };
}
