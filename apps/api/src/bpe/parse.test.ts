import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BpeFormatError, parseBpe } from "./parse.js";

const extract = readFileSync(
  path.resolve(import.meta.dirname, "__fixtures__/bpe-extract.csv"),
  "utf8",
);

describe("parseBpe", () => {
  it("reads commune counts out of a recorded extract", () => {
    const counts = parseBpe(extract);
    const bakeries = counts.find((c) => c.code === "11132" && c.facilityType === "B207");

    expect(bakeries).toEqual({
      code: "11132",
      facilityType: "B207",
      edition: 2025,
      count: 1,
    });
  });

  it("keeps only communes", () => {
    // The published file holds France, départements and régions in the same
    // rows. A distribution built from those compares a village to a region.
    const codes = new Set(parseBpe(extract).map((c) => c.code));

    expect(codes).toEqual(new Set(["11132", "11262", "34172"]));
  });

  it("drops the totals INSEE writes as their own rows", () => {
    // Otherwise a commune's three bakeries arrive again inside its retail
    // total, and again inside its overall total.
    expect(parseBpe(extract).some((c) => c.facilityType === "_T")).toBe(false);
  });

  it("carries no zeroes, because INSEE publishes none", () => {
    // The file is sparse: a commune with no bakery has no bakery row, and a
    // commune with nothing at all is absent from the file entirely. Zero is
    // therefore carried by absence, and reading it that way is only safe for a
    // commune HomeGround knows exists — which is what the classification is
    // for. A commune nobody has heard of stays Unknown.
    expect(parseBpe(extract).every((c) => c.count > 0)).toBe(true);
  });

  it("drops a row it cannot read rather than defaulting it to zero", () => {
    const broken = [
      "GEO;GEO_OBJECT;FACILITY_TYPE;BPE_MEASURE;TIME_PERIOD;OBS_VALUE",
      "11132;COM;B207;FACILITIES;2025;",
      "11132;COM;B202;FACILITIES;2025;not a number",
      ";COM;B105;FACILITIES;2025;3",
      "11132;COM;B201;FACILITIES;2025;2",
    ].join("\n");

    expect(parseBpe(broken)).toEqual([
      { code: "11132", facilityType: "B201", edition: 2025, count: 2 },
    ]);
  });

  it("refuses a file whose columns have changed", () => {
    expect(() => parseBpe("GEO;VALUE\n11132;3")).toThrow(BpeFormatError);
  });

  it("refuses a file holding no communes at all", () => {
    // An ingest that quietly stores nothing looks exactly like one that worked.
    const noCommunes = [
      "GEO;GEO_OBJECT;FACILITY_TYPE;BPE_MEASURE;TIME_PERIOD;OBS_VALUE",
      "FM;FRANCE;B207;FACILITIES;2025;35000",
    ].join("\n");

    expect(() => parseBpe(noCommunes)).toThrow(BpeFormatError);
  });
});
