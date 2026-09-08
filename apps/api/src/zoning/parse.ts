/**
 * The regional health authorities' zoning of professions, from Atlasanté.
 *
 * Every commune in France, and for each of six professions the level an ARS
 * designated it — with the date of the decree that did so. A designation, not
 * a measurement: HomeGround reports what an authority decided and never
 * decides it itself. See specs/evidence.md.
 *
 * The levels are kept exactly as published. "1_ZIP" and "1_Tres_sous_dotee"
 * are the authority's words, and the leading number is the authority's own
 * ordering, worst supply first.
 */

/** The professions this reads, and HomeGround's name for each. */
export const PROFESSIONS: Record<string, string> = {
  zmed_niveau: "gp",
  zdent_niveau: "dentist",
  zide_niveau: "nurse",
  zmk_niveau: "physiotherapist",
  zsf_niveau: "midwife",
  zortho_niveau: "speechTherapist",
};

/** The catchment a profession's zoning was drawn for. */
const CATCHMENT: Record<string, "tvs_lib" | "bvcv_lib"> = {
  // Médecins and dentists are zoned over territoires de vie-santé; the rest
  // over bassins de vie. The distinction matters: it names the area the
  // decision was actually made about, which is never the commune alone.
  gp: "tvs_lib",
  dentist: "tvs_lib",
  nurse: "bvcv_lib",
  physiotherapist: "bvcv_lib",
  midwife: "bvcv_lib",
  speechTherapist: "bvcv_lib",
};

/** Not classified. Overseas collectivities, mostly. Never a level. */
const NOT_CLASSIFIED = /^NC/;

export interface Zoning {
  code: string;
  profession: string;
  level: string;
  decreedAt: Date | null;
  catchment: string | null;
}

export class ZoningFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZoningFormatError";
  }
}

export function parseZoning(csv: string): Zoning[] {
  const lines = csv.split(/\r?\n/);
  const header = splitRow(lines[0] ?? "");
  const column = new Map(header.map((name, index) => [name, index]));

  for (const required of ["com_code", "niveau", ...Object.keys(PROFESSIONS)]) {
    if (!column.has(required)) {
      throw new ZoningFormatError(`The zoning file is missing the ${required} column`);
    }
  }

  const at = (row: string[], name: string) => row[column.get(name) ?? -1] ?? "";
  const zonings: Zoning[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }

    const row = splitRow(line);

    // Arrondissements, Wallis-et-Futuna districts and the rest are territories
    // the commune lookup will never ask for.
    if (at(row, "niveau") !== "COM") {
      continue;
    }

    const code = at(row, "com_code");

    if (code === "") {
      continue;
    }

    for (const [field, profession] of Object.entries(PROFESSIONS)) {
      const level = at(row, field);

      // Not classified is not a level, and not the mildest one either.
      if (level === "" || NOT_CLASSIFIED.test(level)) {
        continue;
      }

      zonings.push({
        code,
        profession,
        level,
        decreedAt: toDate(at(row, field.replace("_niveau", "_date_arrete"))),
        catchment: at(row, CATCHMENT[profession] as string) || null,
      });
    }
  }

  if (zonings.length === 0) {
    throw new ZoningFormatError("The zoning file designated no communes at all");
  }

  return zonings;
}

/** "30/10/2025" — the decree's date, which is the observation date. */
function toDate(text: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** Comma separated, every field quoted. */
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
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field);

  return fields;
}
