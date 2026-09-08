import { readSheet } from "../xlsx/read-sheet.js";

/**
 * INSEE's grille communale de densité, in seven levels.
 *
 * This is HomeGround's definition of a comparable commune — ADR-012 — and its
 * reference list of communes that exist, which is what lets a missing BPE row
 * be read as zero rather than as silence.
 *
 * The published workbook carries four rows of headings before the data, and
 * the column names on the fifth: CODGEO, LIBGEO, DENS, LIBDENS, then
 * population columns this does not read.
 */
const SHEET = "Grille_Densite";
/** INSEE's own column names, matched rather than assumed by position. */
const CODE = "CODGEO";
const LEVEL = "DENS";
const LABEL = "LIBDENS";
/** Seven levels, densest first. A grid with more is a grid that changed. */
const LEVELS = 7;

export interface DensityClass {
  code: string;
  level: number;
  /** INSEE's own words. Never translated: a reader should find them at INSEE. */
  label: string;
}

export class DensityFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DensityFormatError";
  }
}

export function parseDensityGrid(workbook: Buffer): DensityClass[] {
  const rows = readSheet(workbook, SHEET);
  const headerIndex = rows.findIndex((row) => row.includes(CODE) && row.includes(LEVEL));

  if (headerIndex === -1) {
    throw new DensityFormatError(`The grid has no row naming ${CODE} and ${LEVEL}`);
  }

  const header = rows[headerIndex] as string[];
  const column = {
    code: header.indexOf(CODE),
    level: header.indexOf(LEVEL),
    label: header.indexOf(LABEL),
  };

  if (column.label === -1) {
    throw new DensityFormatError(`The grid no longer carries ${LABEL}`);
  }

  const classes: DensityClass[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const code = row[column.code]?.trim() ?? "";
    const level = Number(row[column.level]);
    const label = row[column.label]?.trim() ?? "";

    // A commune whose class cannot be read has no peer group, which is a
    // fact the comparison states. It is never given a default class.
    if (code === "" || label === "" || !Number.isInteger(level)) {
      continue;
    }

    if (level < 1 || level > LEVELS) {
      throw new DensityFormatError(
        `The grid places ${code} at level ${level}, outside the seven this expects`,
      );
    }

    classes.push({ code, level, label });
  }

  if (classes.length === 0) {
    throw new DensityFormatError("The grid classified no communes at all");
  }

  return classes;
}
