import type { Db } from "../db/client.js";
import { bpeCounts } from "../db/schema.js";
import { readZip } from "../zip/read-zip.js";
import { parseBpe } from "./parse.js";

/**
 * INSEE serves the whole of BPE as one zipped CSV through the same melodi API
 * the census uses. Pinned by product id rather than by file name, because the
 * file inside carries its edition year.
 *
 * The alternative was paging the API: 2.3 million observations at a few
 * thousand a page, against one download of fourteen megabytes.
 */
const PRODUCT = "https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2025_CSV_FR";
/** Named inside the archive, alongside a metadata CSV this does not read. */
const DATA_FILE = /_data\.csv$/;
const BATCH = 5000;

export async function ingestBpe(db: Db, fetchImpl = globalThis.fetch): Promise<number> {
  const response = await fetchImpl(PRODUCT);

  if (!response.ok) {
    throw new Error(`Could not download BPE: ${response.status}`);
  }

  const archive = readZip(Buffer.from(await response.arrayBuffer()));
  const name = [...archive.keys()].find((entry) => DATA_FILE.test(entry));

  if (!name) {
    throw new Error(`BPE archive holds no data file: ${[...archive.keys()].join(", ")}`);
  }

  const counts = parseBpe((archive.get(name) as Buffer).toString("utf8"));

  // Replaced whole, per edition. BPE is a census of what exists: a bakery that
  // closed leaves the file, and merging would keep it open for ever.
  await db.transaction(async (tx) => {
    await tx.delete(bpeCounts);

    for (let index = 0; index < counts.length; index += BATCH) {
      await tx.insert(bpeCounts).values(counts.slice(index, index + BATCH));
    }
  });

  return counts.length;
}
