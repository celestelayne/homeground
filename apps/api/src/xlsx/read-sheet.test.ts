import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readSheet, XlsxError } from "./read-sheet.js";

const workbook = readFileSync(path.resolve(import.meta.dirname, "__fixtures__/sample.xlsx"));

describe("readSheet", () => {
  it("reads a sheet by name, not by position", () => {
    // The grid's data sheet is the workbook's second declared sheet and its
    // third file. Reading the first file would return the documentation.
    expect(readSheet(workbook, "Grille")[0]).toEqual(["CODGEO", "LIBDENS"]);
  });

  it("resolves shared strings, including a string split across runs", () => {
    // A label carrying an accent is written as several runs, and joining them
    // wrongly turns "Rural à habitat dispersé" into "Rural".
    expect(readSheet(workbook, "Grille")[1]).toEqual(["01001", "Rural à habitat dispersé", "6"]);
  });

  it("unescapes the entities a label can carry", () => {
    expect(readSheet(workbook, "Grille")[2]).toEqual(["11132", "Bourgs & villages", "5"]);
  });

  it("reads an inline string", () => {
    expect(readSheet(workbook, "Grille")[3]).toEqual(["99999"]);
  });

  it("says which sheets exist when asked for one that does not", () => {
    expect(() => readSheet(workbook, "Grille_Densite")).toThrow(/Documentation, Grille/);
  });

  it("refuses something that is not a workbook", () => {
    expect(() => readSheet(Buffer.from("not a workbook"), "Grille")).toThrow();
  });

  it("refuses a workbook missing its parts", () => {
    const empty = readFileSync(path.resolve(import.meta.dirname, "../zip/__fixtures__/sample.zip"));

    expect(() => readSheet(empty, "Grille")).toThrow(XlsxError);
  });
});
