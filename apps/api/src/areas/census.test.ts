import { describe, expect, it } from "vitest";
import recorded from "./__fixtures__/melodi-dwellings.json" with { type: "json" };
import { toCensusFigures } from "./census.js";
import { AreaLookupUnavailableError } from "./geo-api.js";

const figures = toCensusFigures(recorded);

const find = (metric: string, year: string) =>
  figures.find((f) => f.metric === metric && f.observedAt.toISOString().startsWith(year));

describe("toCensusFigures", () => {
  it("reads dwelling occupancy for every census year the source publishes", () => {
    const years = [...new Set(figures.map((f) => f.observedAt.getUTCFullYear()))].sort();

    // Three editions, so a commune's direction of travel is visible without
    // waiting for HomeGround to observe it.
    expect(years).toEqual([2012, 2017, 2023]);
  });

  it("keeps the weighted value the source published, decimals and all", () => {
    // 624.5973 is not 625 dwellings with noise. The census has been a rolling
    // weighted survey since 2004, so there is no underlying integer to find.
    expect(find("dwellings.main", "2023")?.value).toBeCloseTo(624.5973, 4);
  });

  it("derives the second-home share from the published values, not rounded ones", () => {
    // Rounding the parts first moves the answer, and then two parts of the
    // application disagree about the same commune.
    const share = find("dwellings.secondHomeShare", "2023");

    expect(share?.value).toBeCloseTo(23.52, 2);
    expect(share?.unit).toBe("%");
  });

  it("records which method produced a derived figure", () => {
    // A share computed differently later must be distinguishable from this one.
    expect(find("dwellings.secondHomeShare", "2023")?.method).toBe(
      "second-home-share-of-all-dwellings",
    );
    expect(find("dwellings.secondHomeShare", "2023")?.methodVersion).toBe(1);
  });

  it("dates a figure to the source's observation, not to now", () => {
    expect(find("dwellings.main", "2017")?.observedAt.toISOString()).toBe(
      "2017-01-01T00:00:00.000Z",
    );
  });

  it("derives no share when a year has no total", () => {
    // A share of nothing is nothing, not zero.
    const partial = {
      observations: recorded.observations.filter(
        (o) => o.dimensions.TIME_PERIOD !== "2023" || o.dimensions.OCS !== "_T",
      ),
    };

    expect(
      toCensusFigures(partial).some(
        (f) => f.metric === "dwellings.secondHomeShare" && f.observedAt.getUTCFullYear() === 2023,
      ),
    ).toBe(false);
  });

  it("drops an observation it cannot read rather than guessing at one", () => {
    const ragged = {
      observations: [
        { dimensions: { TIME_PERIOD: "2023", OCS: "DW_MAIN" }, measures: {} },
        { dimensions: { TIME_PERIOD: "2023" }, measures: { OBS_VALUE_NIVEAU: { value: 10 } } },
      ],
    };

    expect(toCensusFigures(ragged)).toEqual([]);
  });

  it("refuses a response it cannot recognise", () => {
    expect(() => toCensusFigures({ nope: true })).toThrow(AreaLookupUnavailableError);
  });
});
