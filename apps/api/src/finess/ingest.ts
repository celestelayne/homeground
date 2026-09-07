import type { Db } from "../db/client.js";
import { facilities } from "../db/schema.js";
import { parseFiness } from "./parse.js";

/**
 * The geolocated extract, resolved through data.gouv.fr rather than pinned:
 * the file name carries its publication date and changes with every release.
 */
const DATASET =
  "https://www.data.gouv.fr/api/1/datasets/finess-extraction-du-fichier-des-etablissements/";

const BATCH = 1000;

export async function resolveExtractUrl(fetchImpl = globalThis.fetch): Promise<string> {
  const response = await fetchImpl(DATASET);

  if (!response.ok) {
    throw new Error(`Could not read the FINESS dataset listing: ${response.status}`);
  }

  const { resources } = (await response.json()) as {
    resources: { title?: string; format?: string; url: string }[];
  };

  const geolocated = resources.find(
    (resource) => resource.format === "csv" && /olocalis/.test(resource.title ?? ""),
  );

  if (!geolocated) {
    throw new Error("The FINESS dataset no longer publishes a geolocated CSV");
  }

  return geolocated.url;
}

/**
 * Replaces the facilities table from the national extract.
 *
 * A whole-table replacement rather than a merge: FINESS is a register, and an
 * establishment that has closed leaves it. Merging would keep pharmacies open
 * on the map long after they had shut.
 */
export async function ingestFiness(db: Db, fetchImpl = globalThis.fetch): Promise<number> {
  const url = await resolveExtractUrl(fetchImpl);
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Could not download the FINESS extract: ${response.status}`);
  }

  const parsed = parseFiness(await response.text());
  const observedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.delete(facilities);

    for (let index = 0; index < parsed.length; index += BATCH) {
      await tx.insert(facilities).values(
        parsed.slice(index, index + BATCH).map((facility) => ({
          ...facility,
          sourceId: "finess",
          observedAt,
        })),
      );
    }
  });

  return parsed.length;
}
