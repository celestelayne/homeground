import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseZoning, ZoningFormatError } from "./parse.js";

const csv = readFileSync(path.resolve(import.meta.dirname, "__fixtures__/zonages.csv"), "utf8");

const forCommune = (code: string, profession: string) =>
  parseZoning(csv).find((z) => z.code === code && z.profession === profession);

describe("parseZoning", () => {
  it("reads a commune's designation and the decree that made it", () => {
    expect(forCommune("11132", "gp")).toEqual({
      code: "11132",
      profession: "gp",
      // The authority's own word, kept. "2_ZAC" is what the ARS published.
      level: "2_ZAC",
      decreedAt: new Date("2025-10-30T00:00:00.000Z"),
      catchment: "Lézignan-Corbières",
    });
  });

  it("names the catchment the decision was actually made about", () => {
    // A designation is drawn over a health catchment, not a commune. Fabrezan
    // is inside Lézignan-Corbières; the ARS looked at the whole of it.
    expect(forCommune("11132", "gp")?.catchment).toBe("Lézignan-Corbières");
    expect(forCommune("11132", "nurse")?.catchment).toBe("Lézignan-Corbières");
  });

  it("reads every profession the authorities zone", () => {
    const professions = parseZoning(csv)
      .filter((z) => z.code === "11132")
      .map((z) => z.profession)
      .sort();

    expect(professions).toEqual([
      "dentist",
      "gp",
      "midwife",
      "nurse",
      "physiotherapist",
      "speechTherapist",
    ]);
  });

  it("keeps designations that differ across professions in one commune", () => {
    // Fabrezan is short of dentists and has nurses to spare. Collapsing the
    // six into one "health" verdict would lose exactly that.
    expect(forCommune("11132", "dentist")?.level).toBe("1_Tres_sous_dotee");
    expect(forCommune("11132", "nurse")?.level).toBe("5_Sur_dotee");
  });

  it("drops a profession the authority did not classify", () => {
    // "NC" is not a level, and it is certainly not the mildest one.
    const mayotte = parseZoning(csv).filter((z) => z.code === "97617");

    expect(mayotte.every((z) => !z.level.startsWith("NC"))).toBe(true);
  });

  it("refuses a file whose columns have changed", () => {
    expect(() => parseZoning('"com_code","niveau"\n"11132","COM"')).toThrow(ZoningFormatError);
  });

  it("refuses a file that designates nothing", () => {
    const header = csv.split("\n")[0] as string;

    expect(() => parseZoning(header)).toThrow(ZoningFormatError);
  });
});
