import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GasparFormatError, parseDesignations, parseDisasters, parseRadon } from "./parse.js";

const fixture = (name: string) =>
  readFileSync(path.resolve(import.meta.dirname, `__fixtures__/${name}`), "utf8");

const designations = parseDesignations(fixture("designations.csv"));
const disasters = parseDisasters(fixture("disasters.csv"));

const forCommune = (code: string) => designations.filter((d) => d.code === code);

describe("parseDesignations", () => {
  it("reads what a commune is recorded as exposed to", () => {
    const fabrezan = forCommune("11132");

    expect(fabrezan.find((d) => d.riskCode === "16")?.label).toBe("Feu de forêt");
    expect(fabrezan.find((d) => d.riskCode === "127")?.label).toBe("Tassements différentiels");
  });

  it("keeps the authority's own words", () => {
    // "Par ruissellement et coulée de boue" is what the state wrote. Softening
    // it into "surface water" would be HomeGround rewriting a designation.
    expect(forCommune("11132").map((d) => d.label)).toContain(
      "Par ruissellement et coulée de boue",
    );
  });

  it("counts a designation once however many procedures mention it", () => {
    // GASPAR lists a commune once per administrative procedure, so the same
    // designation arrives repeatedly. It is one fact about the commune.
    const codes = forCommune("11132").map((d) => d.riskCode);

    expect(codes.length).toBe(new Set(codes).size);
  });

  it("separates a lightly designated commune from a heavy one", () => {
    // The reason the working set exists: designing against Fabrezan alone
    // would build a panel that only ever shows a catastrophe.
    expect(forCommune("40330").length).toBeLessThan(forCommune("11262").length);
  });

  it("refuses a file whose columns have changed", () => {
    expect(() => parseDesignations("cod_commune;lib_risque\n11132;Inondation")).toThrow(
      GasparFormatError,
    );
  });
});

describe("parseDisasters", () => {
  it("keeps when the event happened apart from when the order was signed", () => {
    // Two different facts. A flood in November 2005 was declared in February
    // 2006, and presenting either date as the other misdates the event.
    const flood = disasters.find((d) => d.code === "11132" && d.label.startsWith("Inondations"));

    expect(flood?.beganAt).toBeInstanceOf(Date);
    expect(flood?.signedAt).toBeInstanceOf(Date);
    expect(flood?.signedAt?.getTime()).toBeGreaterThan(flood?.beganAt?.getTime() ?? 0);
  });

  it("records the droughts a commune has been declared for", () => {
    const droughts = disasters.filter((d) => d.code === "11132" && d.label.includes("Sécheresse"));

    expect(droughts.length).toBe(6);
  });

  it("treats one order declaring two kinds as two declarations", () => {
    // The order of January 1992 covered Fabrezan for flooding and for snow
    // load. Keyed on the order alone, one of them would overwrite the other.
    const january1992 = disasters.filter((d) => d.id === "INTE9200448A" && d.code === "11132");

    expect(january1992.map((d) => d.riskCode).sort()).toEqual(["ICB", "PDN"]);
  });

  it("identifies a declaration by its order, its commune, its kind and its episode", () => {
    // One order can cover several separate episodes for the same commune and
    // kind — drought in 1991, in 1992–93 and in 1998, signed on one day — so
    // the dates are part of the identity and not decoration.
    const keys = disasters.map(
      (d) =>
        `${d.id}:${d.code}:${d.riskCode}:${d.beganAt.toISOString()}:${d.endedAt.toISOString()}`,
    );

    expect(keys.length).toBe(new Set(keys).size);
  });

  it("has fewer orders than declarations, which is why both are counted", () => {
    // Twenty declarations from seventeen orders. "Declared twenty times"
    // and "declared by seventeen orders" are both true and different.
    const fabrezan = disasters.filter((d) => d.code === "11132");

    expect(fabrezan.length).toBe(20);
    expect(new Set(fabrezan.map((d) => d.id)).size).toBe(17);
  });

  it("refuses a file that records nothing", () => {
    const header = "id_gaspar;code_commune;lib_risque_jo;date_debut;date_fin;date_signature_arrete";

    expect(() => parseDisasters(header)).toThrow(GasparFormatError);
  });
});

describe("parseRadon", () => {
  it("reads the authority's class for a commune", () => {
    expect(parseRadon(fixture("radon.csv")).find((r) => r.code === "11132")?.potentialClass).toBe(
      1,
    );
  });

  it("skips a row with no INSEE code", () => {
    // The file covers French Polynesia and Wallis-et-Futuna, whose communes
    // arrive with the code column empty. Nothing can be keyed without one.
    const csv =
      "nom_comm;nom_dept;insee_com;classe_potentiel;reg\npapeete;Tahiti;;1;PF\nx;y;11132;1;FR";

    expect(parseRadon(csv).map((r) => r.code)).toEqual(["11132"]);
  });

  it("leaves a shared code unclassified when its rows disagree", () => {
    // Chiconi and Sada both arrive as 97605. Where they agree the class is the
    // same either way; where they disagree, attaching one would put a class on
    // the wrong commune.
    const agree =
      "nom_comm;nom_dept;insee_com;classe_potentiel;reg\nchiconi;May;97605;3;MAY\nsada;May;97605;3;MAY";
    const disagree = agree.replace("sada;May;97605;3", "sada;May;97605;1");

    expect(parseRadon(agree)).toEqual([{ code: "97605", potentialClass: 3 }]);
    expect(() => parseRadon(disagree)).toThrow(GasparFormatError);
  });

  it("refuses a class outside the three the authority defines", () => {
    // A fourth class would mean the scale changed, and a scale that changed
    // silently is one HomeGround would be misreporting.
    const csv = "nom_comm;nom_dept;insee_com;classe_potentiel;reg\nX;Y;11132;4;FR";

    expect(() => parseRadon(csv)).toThrow(GasparFormatError);
  });
});
