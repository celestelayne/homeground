import type { Db } from "../db/client.js";
import { communeDensity } from "../db/schema.js";
import { parseDensityGrid } from "./parse.js";

/**
 * The published grid, by edition. INSEE keeps earlier editions at the same
 * address, so the year is the only thing that changes.
 */
const EDITION = 2024;
const GRID = `https://www.insee.fr/fr/statistiques/fichier/6439600/grille_densite_7_niveaux_${EDITION}.xlsx`;
const BATCH = 5000;

export async function ingestDensityGrid(db: Db, fetchImpl = globalThis.fetch): Promise<number> {
  // INSEE's site refuses a request with no user agent.
  const response = await fetchImpl(GRID, {
    headers: { "User-Agent": "HomeGround/0.1 (https://github.com/celestelayne/homeground)" },
  });

  if (!response.ok) {
    throw new Error(`Could not download the density grid: ${response.status}`);
  }

  const classes = parseDensityGrid(Buffer.from(await response.arrayBuffer()));

  // Replaced whole. Communes merge and split, and a commune that no longer
  // exists must not stay in the peer groups its neighbours are measured
  // against.
  await db.transaction(async (tx) => {
    await tx.delete(communeDensity);

    for (let index = 0; index < classes.length; index += BATCH) {
      await tx
        .insert(communeDensity)
        .values(classes.slice(index, index + BATCH).map((row) => ({ ...row, edition: EDITION })));
    }
  });

  return classes.length;
}
