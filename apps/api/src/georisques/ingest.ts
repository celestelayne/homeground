import type { Db } from "../db/client.js";
import { communeDisasters, communeRadon, communeRisks } from "../db/schema.js";
import { readZip } from "../zip/read-zip.js";
import { parseDesignations, parseDisasters, parseRadon } from "./parse.js";

/**
 * The whole national archive, published as one zip that carries its own date
 * in the file names inside it. Ingested nationally rather than asked per
 * commune, because a designation cannot be read without knowing how common it
 * is, and that is a national question.
 */
const GASPAR = "http://files.georisques.fr/GASPAR/gaspar.zip";
/** Designations, and declared disaster orders. Dated names, matched loosely. */
const DESIGNATIONS = /ddrm_risq_gaspar.*\.csv$/;
const DISASTERS = /catnat_gaspar.*\.csv$/;

/**
 * Radon comes from the nuclear safety authority rather than from GASPAR, and
 * is resolved through data.gouv because its file name carries a date.
 */
const RADON_DATASET =
  "https://www.data.gouv.fr/api/1/datasets/connaitre-le-potentiel-radon-de-ma-commune/";

const BATCH = 5000;

export async function ingestGeorisques(
  db: Db,
  fetchImpl = globalThis.fetch,
): Promise<{
  designations: number;
  disasters: number;
  radon: number;
}> {
  const response = await fetchImpl(GASPAR);

  if (!response.ok) {
    throw new Error(`Could not download GASPAR: ${response.status}`);
  }

  const archive = readZip(Buffer.from(await response.arrayBuffer()));
  const designations = parseDesignations(read(archive, DESIGNATIONS, "designations"));
  const disasters = parseDisasters(read(archive, DISASTERS, "disaster orders"));
  const radon = parseRadon(await fetchRadon(fetchImpl));

  // Replaced whole. An order is superseded, a designation is lifted, and a
  // merge sends both to a different commune; merging would keep all three.
  await db.transaction(async (tx) => {
    await tx.delete(communeRisks);
    await tx.delete(communeDisasters);
    await tx.delete(communeRadon);

    for (let index = 0; index < designations.length; index += BATCH) {
      await tx.insert(communeRisks).values(designations.slice(index, index + BATCH));
    }

    for (let index = 0; index < disasters.length; index += BATCH) {
      await tx.insert(communeDisasters).values(disasters.slice(index, index + BATCH));
    }

    for (let index = 0; index < radon.length; index += BATCH) {
      await tx.insert(communeRadon).values(radon.slice(index, index + BATCH));
    }
  });

  return {
    designations: designations.length,
    disasters: disasters.length,
    radon: radon.length,
  };
}

function read(archive: Map<string, Buffer>, pattern: RegExp, what: string): string {
  const name = [...archive.keys()].find((entry) => pattern.test(entry));

  if (!name) {
    throw new Error(`GASPAR holds no ${what} file: ${[...archive.keys()].join(", ")}`);
  }

  return (archive.get(name) as Buffer).toString("utf8");
}

async function fetchRadon(fetchImpl: typeof globalThis.fetch): Promise<string> {
  const listing = await fetchImpl(RADON_DATASET);

  if (!listing.ok) {
    throw new Error(`Could not read the radon dataset listing: ${listing.status}`);
  }

  const { resources } = (await listing.json()) as { resources: { format?: string; url: string }[] };
  const csv = resources.find((resource) => resource.format === "csv");

  if (!csv) {
    throw new Error("The radon dataset no longer publishes a CSV");
  }

  const file = await fetchImpl(csv.url);

  if (!file.ok) {
    throw new Error(`Could not download the radon file: ${file.status}`);
  }

  return await file.text();
}
