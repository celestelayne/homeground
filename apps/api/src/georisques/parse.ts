/**
 * Géorisques: what the state records about a commune's exposure.
 *
 * Two different kinds of fact arrive from the same archive, and M4 rests on
 * keeping them apart. A **designation** says a commune is recorded as exposed
 * to something — no date, no severity, and thirteen of them is unremarkable in
 * France. A **declared disaster** says something happened and the state said so
 * in a signed order, on a date.
 *
 * Both are reported, never scored. See docs/methodology.md.
 */

export class GasparFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GasparFormatError";
  }
}

export interface Designation {
  code: string;
  /** The authority's own code — "127" is differential settlement. */
  riskCode: string;
  /** The authority's own words. */
  label: string;
}

export interface Disaster {
  id: string;
  code: string;
  /** The kind declared. One order can declare several at once. */
  riskCode: string;
  label: string;
  /**
   * The episode. One order can cover several for the same commune and kind —
   * a December 2000 order declared drought in Aix-en-Provence for 1991, for
   * 1992–93 and for 1998 — so the dates are part of what makes a declaration
   * itself rather than a duplicate.
   */
  beganAt: Date;
  endedAt: Date;
  /** When the order was signed. Not when the event happened. */
  signedAt: Date | null;
}

export interface RadonClass {
  code: string;
  potentialClass: number;
}

/** GASPAR's own column names, matched rather than assumed by position. */
const DESIGNATION_COLUMNS = ["cod_commune", "num_risque", "lib_risque"] as const;
const DISASTER_COLUMNS = [
  "id_gaspar",
  "code_commune",
  "num_risque_jo",
  "lib_risque_jo",
  "date_debut",
  "date_fin",
  "date_signature_arrete",
] as const;

export function parseDesignations(csv: string): Designation[] {
  const rows = readRows(csv, DESIGNATION_COLUMNS, "designations");
  const designations: Designation[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const code = row.cod_commune?.trim() ?? "";
    const riskCode = row.num_risque?.trim() ?? "";
    const label = row.lib_risque?.trim() ?? "";

    if (code === "" || riskCode === "" || label === "") {
      continue;
    }

    // The file lists a commune once per procedure, so the same designation
    // arrives several times. It is one fact about the commune.
    const key = `${code}:${riskCode}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    designations.push({ code, riskCode, label });
  }

  if (designations.length === 0) {
    throw new GasparFormatError("GASPAR designated no communes at all");
  }

  return designations;
}

export function parseDisasters(csv: string): Disaster[] {
  const rows = readRows(csv, DISASTER_COLUMNS, "disaster orders");
  const disasters: Disaster[] = [];

  for (const row of rows) {
    const id = row.id_gaspar?.trim() ?? "";
    const code = row.code_commune?.trim() ?? "";
    const riskCode = row.num_risque_jo?.trim() ?? "";
    const label = row.lib_risque_jo?.trim() ?? "";

    const beganAt = toDate(row.date_debut);
    const endedAt = toDate(row.date_fin);

    // Every row in the published archive carries both. One that does not
    // cannot be told apart from another episode of the same declaration, so
    // it is dropped rather than merged into one.
    if (id === "" || code === "" || riskCode === "" || label === "" || !beganAt || !endedAt) {
      continue;
    }

    disasters.push({
      id,
      code,
      riskCode,
      label,
      beganAt,
      endedAt,
      signedAt: toDate(row.date_signature_arrete),
    });
  }

  if (disasters.length === 0) {
    throw new GasparFormatError("GASPAR recorded no disaster orders at all");
  }

  return disasters;
}

/** The nuclear safety authority's file: one class per commune, 1 to 3. */
const RADON_CLASSES = 3;

export function parseRadon(csv: string): RadonClass[] {
  const rows = readRows(csv, ["insee_com", "classe_potentiel"], "radon classes");
  const byCode = new Map<string, Set<number>>();

  for (const row of rows) {
    const code = row.insee_com?.trim() ?? "";
    const potentialClass = Number(row.classe_potentiel);

    // The file covers the overseas collectivities too, and they have no INSEE
    // code in it — French Polynesia's communes arrive with the column empty.
    // Nothing can be keyed to a commune without one.
    if (code === "" || !Number.isInteger(potentialClass)) {
      continue;
    }

    if (potentialClass < 1 || potentialClass > RADON_CLASSES) {
      throw new GasparFormatError(
        `The radon file puts ${code} in class ${potentialClass}, outside the three it defines`,
      );
    }

    const held = byCode.get(code) ?? new Set<number>();
    held.add(potentialClass);
    byCode.set(code, held);
  }

  const classes: RadonClass[] = [];

  for (const [code, held] of byCode) {
    // A few codes appear twice — Chiconi and Sada both arrive as 97605, and
    // Saint-Pierre and Miquelon-Langlade both as 97500. Where the two rows
    // agree the class is the same either way. Where they disagree there is no
    // way to tell which commune is meant, and a guess would attach a class to
    // the wrong place, so the code is left unclassified.
    if (held.size !== 1) {
      continue;
    }

    classes.push({ code, potentialClass: [...held][0] as number });
  }

  if (classes.length === 0) {
    throw new GasparFormatError("The radon file classified no communes at all");
  }

  return classes;
}

/** "1999-12-25 12:00:00" — the date matters, the noon does not. */
function toDate(text: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text?.trim() ?? "");

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/**
 * Semicolon separated, quoted where a label contains one. A file whose columns
 * have changed fails loudly rather than reading a shifted column as a risk.
 */
function readRows(
  csv: string,
  required: readonly string[],
  what: string,
): Record<string, string>[] {
  const lines = csv.split(/\r?\n/);
  const header = splitRow(lines[0] ?? "");

  for (const column of required) {
    if (!header.includes(column)) {
      throw new GasparFormatError(`The ${what} file is missing the ${column} column`);
    }
  }

  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }

    const values = splitRow(line);
    const row: Record<string, string> = {};

    header.forEach((name, index) => {
      row[name] = values[index] ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function splitRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
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
