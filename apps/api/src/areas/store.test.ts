import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaBoundaries, areas, evidence, facilities, sources } from "../db/schema.js";
import { getTestDb } from "../test/database.js";
import commune from "./__fixtures__/geo-api-commune.json" with { type: "json" };
import census from "./__fixtures__/melodi-dwellings.json" with { type: "json" };
import { getArea, registerSources } from "./store.js";
import { SOURCES } from "../sources/registry.js";

const { db } = getTestDb();

/** Counts what each upstream service was actually asked for. */
function recordingFetch(options: { censusFails?: boolean; code?: string } = {}) {
  const calls: string[] = [];

  const fetchImpl = (async (input: unknown) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("melodi")) {
      return options.censusFails
        ? new Response("", { status: 503 })
        : new Response(JSON.stringify(census), { status: 200 });
    }

    // The fixture is Fabrezan; a test asking for another commune needs the
    // reply to agree, or the area row and its evidence disagree on the code.
    return new Response(
      JSON.stringify(options.code ? { ...commune, code: options.code } : commune),
      { status: 200 },
    );
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

const CODE = "11132";

beforeEach(async () => {
  await db.delete(facilities);
  await db.delete(evidence);
  await db.delete(areaBoundaries);
  await db.delete(areas);
  await db.delete(sources);
  await registerSources(db);
});

afterEach(async () => {
  await db.delete(facilities);
  await db.delete(evidence);
  await db.delete(areaBoundaries);
  await db.delete(areas);
  await db.delete(sources);
});

describe("a commune is fetched once", () => {
  it("does not ask the upstream services twice for the same commune", async () => {
    // The requirement M2 states, and what the rate limiting demands: both
    // geo.api.gouv.fr and INSEE throttle in ordinary use.
    const { fetchImpl, calls } = recordingFetch();

    await getArea(db, CODE, fetchImpl);
    const before = calls.length;
    await getArea(db, CODE, fetchImpl);

    expect(before).toBeGreaterThan(0);
    expect(calls.length).toBe(before);
  });

  it("returns the same commune from the store as it did from the network", async () => {
    const { fetchImpl } = recordingFetch();

    const fetched = await getArea(db, CODE, fetchImpl);
    const held = await getArea(db, CODE, fetchImpl);

    expect(held).toEqual(fetched);
  });
});

describe("evidence carries its provenance", () => {
  it("gives every figure a source, a method and a version", async () => {
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);

    expect(area.evidence.length).toBeGreaterThan(0);

    for (const fact of area.evidence) {
      expect(fact.sourceId).not.toBe("");
      expect(fact.method).not.toBe("");
      expect(fact.methodVersion).toBeGreaterThanOrEqual(1);
    }
  });

  it("marks census figures estimated, because the source publishes estimates", async () => {
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);
    const share = area.evidence.find(
      (f) => f.metric === "dwellings.secondHomeShare" && f.observedAt?.startsWith("2023"),
    );

    // Calling a weighted survey figure "known" would launder it into a count.
    expect(share?.state).toBe("estimated");
    expect(share?.value).toBeCloseTo(23.52, 2);
  });

  it("dates a figure to the source's observation, not to the fetch", async () => {
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);
    const main = area.evidence.find(
      (f) => f.metric === "dwellings.main" && f.observedAt?.startsWith("2023"),
    );

    expect(main?.observedAt).toBe("2023-01-01T00:00:00.000Z");
  });
});

describe("one source failing does not remove another's evidence", () => {
  it("keeps the administrative figures when the census cannot answer", async () => {
    // docs/methodology.md: one failed source must not invalidate the rest of
    // an assessment.
    const { fetchImpl } = recordingFetch({ censusFails: true });
    const area = await getArea(db, CODE, fetchImpl);

    expect(area.name).toBe("Fabrezan");
    expect(area.evidence.find((f) => f.metric === "population")?.state).toBe("known");
  });

  it("says the census was unavailable rather than saying there are no figures", async () => {
    const { fetchImpl } = recordingFetch({ censusFails: true });
    const area = await getArea(db, CODE, fetchImpl);
    const census = area.evidence.filter((f) => f.sourceId === "insee-census");

    expect(census).toHaveLength(1);
    expect(census[0]?.state).toBe("unavailable");
    // Unavailable carries nothing. A commune of no second homes is a different
    // claim from a commune we could not ask about.
    expect(census[0]?.value).toBeNull();
  });
});

describe("the source registry", () => {
  it("registers every source the application declares", async () => {
    const rows = await db.select().from(sources);

    expect(rows.map((r) => r.id).sort()).toEqual(SOURCES.map((s) => s.id).sort());
  });

  it("has evidence behind every registered source", async () => {
    // A registry entry with nothing behind it claims a capability HomeGround
    // does not have. See specs/evidence.md.
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);
    const cited = new Set(area.evidence.map((f) => f.sourceId));

    expect([...cited].sort()).toEqual(SOURCES.map((s) => s.id).sort());
  });

  it("states a limitation for every source", async () => {
    for (const source of SOURCES) {
      expect(source.limitations.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("a commune the sources know nothing about", () => {
  it("marks census figures unknown when the census answers with nothing", async () => {
    // A commune with no census data is not a commune with no housing, and
    // recording no rows at all would be indistinguishable from never asking.
    const empty = (async (input: unknown) => {
      const url = String(input);

      return url.includes("melodi")
        ? new Response(JSON.stringify({ observations: [] }), { status: 200 })
        : new Response(JSON.stringify(commune), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const area = await getArea(db, CODE, empty);
    const census = area.evidence.filter((f) => f.sourceId === "insee-census");

    expect(census).toHaveLength(4);
    for (const fact of census) {
      expect(fact.state).toBe("unknown");
      expect(fact.value).toBeNull();
    }
  });

  it("will not call a facility count zero where the directory does not reach", async () => {
    // The geolocated FINESS extract holds nothing overseas, so counting none
    // in Mayotte says nothing about Mayotte.
    const { fetchImpl } = recordingFetch({ code: "97617" });
    const area = await getArea(db, "97617", fetchImpl);
    const health = area.evidence.filter((f) => f.sourceId === "finess");

    expect(health).toHaveLength(2);
    for (const fact of health) {
      expect(fact.state).toBe("unknown");
      expect(fact.value).toBeNull();
    }
  });

  it("still calls zero zero where the directory does reach", async () => {
    await db.insert(facilities).values({
      id: "test-1",
      areaCode: "11999",
      kind: "pharmacy",
      name: "Somewhere else in the Aude",
      latitude: 43.1,
      longitude: 2.7,
      precision: "exact",
      sourceId: "finess",
    });

    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);
    const pharmacies = area.evidence.find((f) => f.metric === "health.pharmacies");

    // FINESS holds facilities in this département, so none in this commune is
    // a finding rather than a gap.
    expect(pharmacies?.state).toBe("known");
    expect(pharmacies?.value).toBe(0);
  });
});
