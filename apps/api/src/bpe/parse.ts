/**
 * BPE — INSEE's permanent facilities base: how many bakeries, schools, doctors
 * and post offices each commune has.
 *
 * Published as one zipped CSV of 2.3 million observations covering every
 * geographic level. Only communes are kept: a national query returns
 * arrondissements, départements and régions in the same file, and a
 * distribution built from those would compare a village to a region.
 *
 * The file is a count of facilities, not a list of them. A row says a commune
 * has three bakeries; it does not say where they are. That is why BPE cannot
 * put anything on the map, and why FINESS remains the only located source.
 */

/** The columns this reads. A file missing one of them is a file that changed. */
const REQUIRED = [
  "GEO",
  "GEO_OBJECT",
  "FACILITY_TYPE",
  "BPE_MEASURE",
  "TIME_PERIOD",
  "OBS_VALUE",
] as const;

/**
 * INSEE writes domain and sub-domain totals as their own rows, marked `_T`.
 * Keeping them would double count: a commune's three bakeries would arrive
 * again inside its retail total and again inside its overall total.
 */
const TOTAL = "_T";

export interface CommuneCount {
  /** INSEE code. The CSV writes it plain for communes — "11132". */
  code: string;
  /** BPE's own type code — "B207" is a bakery. Kept as published. */
  facilityType: string;
  /** The edition year, so two editions can sit side by side. */
  edition: number;
  count: number;
}

export class BpeFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BpeFormatError";
  }
}

export function parseBpe(csv: string): CommuneCount[] {
  const lines = csv.split(/\r?\n/);
  const header = splitRow(lines[0] ?? "");
  const column = new Map(header.map((name, index) => [name, index]));

  for (const required of REQUIRED) {
    if (!column.has(required)) {
      throw new BpeFormatError(`BPE is missing the ${required} column`);
    }
  }

  const at = (row: string[], name: (typeof REQUIRED)[number]) => row[column.get(name) as number];
  const counts: CommuneCount[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }

    const row = splitRow(line);

    if (at(row, "GEO_OBJECT") !== "COM" || at(row, "BPE_MEASURE") !== "FACILITIES") {
      continue;
    }

    const facilityType = at(row, "FACILITY_TYPE") ?? "";

    if (facilityType === "" || facilityType === TOTAL) {
      continue;
    }

    const code = at(row, "GEO") ?? "";
    const observed = at(row, "OBS_VALUE") ?? "";
    // Number("") is 0, so an empty cell would arrive as a commune with none of
    // something rather than as a row that could not be read. That is the exact
    // substitution this application exists to avoid, and it was caught here by
    // a test rather than on screen.
    const count = observed.trim() === "" ? Number.NaN : Number(observed);
    const edition = Number(at(row, "TIME_PERIOD"));

    // A row that cannot be read is dropped rather than defaulted. A count
    // guessed at zero is the substitution this whole application exists to
    // avoid, and one row fewer is the smaller loss.
    if (code === "" || !Number.isInteger(count) || count < 0 || !Number.isInteger(edition)) {
      continue;
    }

    counts.push({ code, facilityType, edition, count });
  }

  if (counts.length === 0) {
    throw new BpeFormatError("BPE held no commune counts at all");
  }

  return counts;
}

/** Semicolon separated, most fields quoted, no embedded newlines. */
function splitRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      // A doubled quote inside a quoted field is one quote.
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ";" && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field);

  return fields;
}
