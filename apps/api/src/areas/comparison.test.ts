import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bpeCounts, communeDensity } from "../db/schema.js";
import { getTestDb } from "../test/database.js";
import { comparisonEvidence } from "./comparison.js";

const { db } = getTestDb();

/** A class of 40, which clears the minimum, and one of 5, which does not. */
const BIG = 5;
const TINY = 4;

/**
 * A small world with known answers.
 *
 * Bakeries are given to the first ten communes of the big class only, so the
 * distribution is flat and checkable by hand: thirty communes have none.
 */
async function seed() {
  const density: { code: string; level: number; label: string; edition: number }[] = [];
  const counts: { code: string; facilityType: string; edition: number; count: number }[] = [];

  for (let index = 0; index < 40; index += 1) {
    const code = `9${String(index).padStart(4, "0")}`;
    density.push({ code, level: BIG, label: "Bourgs ruraux", edition: 2024 });

    if (index < 10) {
      // Ten communes with one bakery each. BPE publishes no zeroes, so the
      // other thirty simply have no row.
      counts.push({ code, facilityType: "B207", edition: 2025, count: 1 });
    }
  }

  for (let index = 0; index < 5; index += 1) {
    density.push({
      code: `8${String(index).padStart(4, "0")}`,
      level: TINY,
      label: "Ceintures urbaines",
      edition: 2024,
    });
  }

  // In BPE, absent from the grid: a commune created since the grid's edition.
  counts.push({ code: "70000", facilityType: "B207", edition: 2025, count: 2 });

  await db.insert(communeDensity).values(density);
  await db.insert(bpeCounts).values(counts);
}

beforeEach(async () => {
  await db.delete(bpeCounts);
  await db.delete(communeDensity);
  await seed();
});

afterEach(async () => {
  await db.delete(bpeCounts);
  await db.delete(communeDensity);
});

const find = (rows: Awaited<ReturnType<typeof comparisonEvidence>>, metric: string) =>
  rows.find((row) => row.metric === metric);

describe("a commune's position among comparable communes", () => {
  it("counts what the source holds", async () => {
    const bakeries = find(await comparisonEvidence(db, "90000"), "shops.bakery");

    expect(bakeries).toMatchObject({ value: 1, unit: "bakeries", state: "known" });
  });

  it("reads a missing row as none, for a commune the classification says exists", async () => {
    // BPE publishes no zeroes. A commune with no bakery has no bakery row, and
    // reading that as none is only safe because the grid lists the commune.
    const bakeries = find(await comparisonEvidence(db, "90020"), "shops.bakery");

    expect(bakeries).toMatchObject({ value: 0, state: "known" });
  });

  it("says how many comparable communes hold fewer", async () => {
    // Thirty of forty have none, so a commune with one is above 75% of them.
    const percentile = find(await comparisonEvidence(db, "90000"), "shops.bakery.peerPercentile");

    expect(percentile).toMatchObject({ value: 75, unit: "percent", state: "known", peers: 40 });
  });

  it("says what the middle of the group holds", async () => {
    // Thirty of forty have none, so the median commune has none.
    const median = find(await comparisonEvidence(db, "90000"), "shops.bakery.peerMedian");

    expect(median).toMatchObject({ value: 0, unit: "bakeries", state: "known" });
  });

  it("names the group and its size, in the classification's own words", async () => {
    const percentile = find(await comparisonEvidence(db, "90000"), "shops.bakery.peerPercentile");

    // "Compared to similar communes" tells a reader nothing they can weigh.
    expect(percentile?.basis).toBe("Bourgs ruraux, INSEE density grid 2024");
    expect(percentile?.peers).toBe(40);
  });

  it("cites the classification as well as the figures", async () => {
    const percentile = find(await comparisonEvidence(db, "90000"), "shops.bakery.peerPercentile");

    expect(percentile?.sourceId).toBe("insee-bpe");
    expect(percentile?.basisSourceId).toBe("insee-density-grid");
  });
});

describe("comparisons that cannot be made", () => {
  it("keeps the count but not the position for an unclassified commune", async () => {
    // A commune created since the grid's edition: it has figures, and no class
    // to be compared within.
    const rows = await comparisonEvidence(db, "70000");

    expect(find(rows, "shops.bakery")).toMatchObject({ value: 2, state: "known" });
    expect(find(rows, "shops.bakery.peerPercentile")).toMatchObject({
      value: null,
      state: "unknown",
      basis: null,
      peers: null,
    });
  });

  it("refuses to compare within a class too small to say anything", async () => {
    const rows = await comparisonEvidence(db, "80000");

    // Five communes is not a distribution. Stated rather than computed anyway.
    expect(find(rows, "shops.bakery")).toMatchObject({ value: 0, state: "known" });
    expect(find(rows, "shops.bakery.peerPercentile")).toMatchObject({ state: "unknown" });
    expect(find(rows, "shops.bakery.peerMedian")).toMatchObject({ state: "unknown" });
  });

  it("says nothing at all about a commune neither source has heard of", async () => {
    const rows = await comparisonEvidence(db, "00000");

    // Not zero bakeries: a commune HomeGround cannot confirm exists cannot
    // have a missing row read as none.
    expect(find(rows, "shops.bakery")).toMatchObject({ value: null, state: "unknown" });
    expect(find(rows, "shops.bakery.peerPercentile")).toMatchObject({ state: "unknown" });
  });

  it("never states a position without the group it is a position among", async () => {
    const rows = [
      ...(await comparisonEvidence(db, "90000")),
      ...(await comparisonEvidence(db, "70000")),
      ...(await comparisonEvidence(db, "00000")),
    ];

    for (const row of rows.filter((r) => r.metric.includes(".peer"))) {
      const complete = row.basis !== null && row.basisSourceId !== null && row.peers !== null;

      expect(complete).toBe(row.state === "known");
    }
  });
});
