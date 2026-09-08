import { getTableColumns, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTestDb } from "../test/database.js";
import { areaBoundaries, areas, evidence, evidenceState, sources } from "./schema.js";

const { db } = getTestDb();

const source = {
  id: "insee-census",
  name: "Recensement de la population",
  publisher: "INSEE",
  description: "Population, age and dwelling occupancy by commune.",
  url: "https://api.insee.fr/melodi",
  cadence: "annual",
  coverage: "France",
  licence: "Licence Ouverte",
  limitations: ["Figures are weighted survey estimates, not counts."],
};

const area = {
  code: "11132",
  name: "Fabrezan",
  postcodes: ["11200"],
  departmentCode: "11",
  departmentName: "Aude",
  regionCode: "76",
  regionName: "Occitanie",
  centreLatitude: 43.1282,
  centreLongitude: 2.7139,
};

const measurement = {
  areaCode: area.code,
  metric: "dwellings.main",
  value: 624.5973,
  unit: "dwellings",
  state: "estimated" as const,
  sourceId: source.id,
  method: "census-dwellings",
  methodVersion: 1,
};

/**
 * The name of the constraint that rejected a write.
 *
 * Drizzle wraps driver errors in a "Failed query" message and keeps the
 * Postgres detail on `cause`, so asserting on the message alone would pass for
 * any failure at all.
 */
async function rejectedBy(write: Promise<unknown>): Promise<string> {
  try {
    await write;
  } catch (error) {
    const cause = (error as { cause?: { constraint?: string; message?: string } }).cause;

    return cause?.constraint ?? cause?.message ?? String(error);
  }

  throw new Error("expected the write to be rejected, but it succeeded");
}

beforeEach(async () => {
  // The application registers its real sources on boot, and tests share one
  // database, so start from an empty registry rather than from whatever the
  // last file left behind.
  await db.delete(evidence);
  await db.delete(areaBoundaries);
  await db.delete(areas);
  await db.delete(sources);
  await db.insert(sources).values(source);
  await db.insert(areas).values(area);
});

afterEach(async () => {
  await db.delete(evidence);
  await db.delete(areaBoundaries);
  await db.delete(areas);
  await db.delete(sources);
});

describe("the evidence states", () => {
  it("offers exactly the five specs/evidence.md names", () => {
    // Four are named in docs/milestones.md. The fifth, unavailable, is the
    // distinction between "no pharmacy" and "could not find out".
    expect(evidenceState.enumValues).toEqual([
      "known",
      "estimated",
      "unknown",
      "unavailable",
      "stale",
    ]);
  });
});

describe("absence is never a value", () => {
  it("refuses an unknown that carries a figure", async () => {
    // A commune with no data is not a commune of nobody.
    expect(
      await rejectedBy(
        db
          .insert(evidence)
          .values({ ...measurement, state: "unknown", value: 0, unit: "dwellings" }),
      ),
    ).toBe("evidence_absence_has_no_value");
  });

  it("refuses an unavailable that carries a figure", async () => {
    expect(
      await rejectedBy(
        db
          .insert(evidence)
          .values({ ...measurement, state: "unavailable", value: 624, unit: "dwellings" }),
      ),
    ).toBe("evidence_absence_has_no_value");
  });

  it("refuses a known with no figure", async () => {
    expect(
      await rejectedBy(
        db.insert(evidence).values({ ...measurement, state: "known", value: null, unit: null }),
      ),
    ).toBe("evidence_absence_has_no_value");
  });

  it("refuses a figure with no unit", async () => {
    // 28.87 is nothing. 28.87 km² is a fact.
    expect(await rejectedBy(db.insert(evidence).values({ ...measurement, unit: null }))).toBe(
      "evidence_absence_has_no_value",
    );
  });

  it("accepts an unknown that carries nothing", async () => {
    await db.insert(evidence).values({
      ...measurement,
      metric: "services.pharmacy",
      state: "unknown",
      value: null,
      unit: null,
    });

    const [row] = await db.select().from(evidence);
    expect(row?.state).toBe("unknown");
    expect(row?.value).toBeNull();
  });
});

describe("every piece of evidence cites a registered source", () => {
  it("refuses evidence citing a source that is not registered", async () => {
    expect(
      await rejectedBy(db.insert(evidence).values({ ...measurement, sourceId: "made-up" })),
    ).toBe("evidence_source_id_sources_id_fk");
  });
});

describe("a source must state a limitation", () => {
  it("refuses a source with an empty limitations list", async () => {
    // array_length returns null for an empty array and a check evaluating to
    // null passes, so this is enforced with cardinality. The first version of
    // the constraint let exactly this row through.
    expect(
      await rejectedBy(db.insert(sources).values({ ...source, id: "no-limits", limitations: [] })),
    ).toBe("sources_state_a_limitation");
  });

  it("accepts a source that states one", async () => {
    await db.insert(sources).values({
      ...source,
      id: "finess",
      limitations: ["Registers establishments, not practitioners."],
    });

    const rows = await db.select().from(sources);
    expect(rows.map((r) => r.id).sort()).toEqual(["finess", "insee-census"]);
  });
});

describe("one figure per metric per observation", () => {
  it("keeps the same metric for different observation years", async () => {
    await db.insert(evidence).values([
      { ...measurement, observedAt: new Date("2017-01-01") },
      { ...measurement, observedAt: new Date("2023-01-01") },
    ]);

    expect(await db.select().from(evidence)).toHaveLength(2);
  });

  it("refuses the same metric twice for one observation year", async () => {
    await db.insert(evidence).values({ ...measurement, observedAt: new Date("2023-01-01") });

    expect(
      await rejectedBy(
        db.insert(evidence).values({ ...measurement, observedAt: new Date("2023-01-01") }),
      ),
    ).toBe("evidence_one_per_observation");
  });

  it("refuses a second undated row for one metric", async () => {
    // Postgres treats nulls as distinct, so an unknown — which has no date to
    // carry — would otherwise be insertable any number of times.
    const undated = { ...measurement, state: "unknown" as const, value: null, unit: null };
    await db.insert(evidence).values(undated);

    expect(await rejectedBy(db.insert(evidence).values(undated))).toBe(
      "evidence_one_undated_per_metric",
    );
  });
});

describe("an Area holds identity, not measurements", () => {
  it("keeps the boundary out of the commune's own row", async () => {
    // ADR-005: a boundary sitting beside a commune's name invites hand-rolled
    // containment logic. In its own table, anything reaching for containment
    // has to visibly join a blob it was told not to query. PostGIS replaces it with
    // PostGIS geometry, which is when asking questions of it becomes correct.
    expect(Object.keys(getTableColumns(areas))).not.toContain("boundary");
    expect(Object.keys(getTableColumns(areaBoundaries))).toEqual([
      "code",
      "geojson",
      "retrievedAt",
    ]);
  });

  it("drops a cached boundary when the commune goes", async () => {
    await db.insert(areaBoundaries).values({
      code: area.code,
      geojson: { type: "Polygon", coordinates: [] },
    });
    await db.delete(areas).where(sql`${areas.code} = ${area.code}`);

    expect(await db.select().from(areaBoundaries)).toHaveLength(0);
  });

  it("carries no population, surface or density column", async () => {
    // Those are measurements and live in evidence with their provenance —
    // the rule that keeps derived evidence off properties. See ADR-003.
    const columns = Object.keys(getTableColumns(areas));

    expect(columns).not.toContain("population");
    expect(columns).not.toContain("areaSqKm");
    expect(columns).not.toContain("densityPerSqKm");
  });

  it("removes a commune's evidence when the commune goes", async () => {
    await db.insert(evidence).values(measurement);
    await db.delete(areas).where(sql`${areas.code} = ${area.code}`);

    expect(await db.select().from(evidence)).toHaveLength(0);
  });
});
