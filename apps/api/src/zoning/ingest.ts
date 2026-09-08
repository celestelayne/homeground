import type { Db } from "../db/client.js";
import { healthZoning } from "../db/schema.js";
import { parseZoning } from "./parse.js";

/**
 * Resolved through data.gouv rather than pinned: the file's address carries
 * the date it was published, and the ARS decrees change under it.
 */
const DATASET =
  "https://www.data.gouv.fr/api/1/datasets/zonages-des-professionnels-de-sante-liberaux/";
const BATCH = 5000;

export async function resolveZoningUrl(fetchImpl = globalThis.fetch): Promise<string> {
  const response = await fetchImpl(DATASET);

  if (!response.ok) {
    throw new Error(`Could not read the zoning dataset listing: ${response.status}`);
  }

  const { resources } = (await response.json()) as {
    resources: { title?: string; format?: string; url: string }[];
  };

  // Three tables are published; this is the one keyed on communes. The others
  // cover priority urban quarters and grand quartiers.
  const communes = resources.find(
    (resource) => resource.format === "csv" && /zonages[-_]com/.test(resource.url),
  );

  if (!communes) {
    throw new Error("The zoning dataset no longer publishes a commune table");
  }

  return communes.url;
}

export async function ingestZoning(db: Db, fetchImpl = globalThis.fetch): Promise<number> {
  const response = await fetchImpl(await resolveZoningUrl(fetchImpl));

  if (!response.ok) {
    throw new Error(`Could not download the zoning table: ${response.status}`);
  }

  const zonings = parseZoning(await response.text());

  // Replaced whole. A decree supersedes the one before it, and a commune that
  // has been re-zoned must not keep both designations.
  await db.transaction(async (tx) => {
    await tx.delete(healthZoning);

    for (let index = 0; index < zonings.length; index += BATCH) {
      await tx.insert(healthZoning).values(zonings.slice(index, index + BATCH));
    }
  });

  return zonings.length;
}
