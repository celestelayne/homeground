import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaBoundaries, areas, evidence, facilities, sources } from "../db/schema.js";
import { SOURCES } from "../sources/registry.js";
import { getTestDb } from "../test/database.js";
import commons from "../wikidata/__fixtures__/commons-imageinfo.json" with { type: "json" };
import claims from "../wikidata/__fixtures__/wikidata-claims.json" with { type: "json" };
import search from "../wikidata/__fixtures__/wikidata-search.json" with { type: "json" };
import commune from "./__fixtures__/geo-api-commune.json" with { type: "json" };
import census from "./__fixtures__/melodi-dwellings.json" with { type: "json" };
import { getArea, registerSources } from "./store.js";

const { db } = getTestDb();

/** Counts what each upstream service was actually asked for. */
function recordingFetch(
  options: {
    censusFails?: boolean;
    code?: string;
    /** Nobody has photographed this commune. One in seven of them. */
    noImage?: boolean;
    /** Wikidata answers, Commons does not, so the credit cannot be read. */
    commonsFails?: boolean;
  } = {},
) {
  const calls: string[] = [];

  const fetchImpl = (async (input: unknown) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("melodi")) {
      return options.censusFails
        ? new Response("", { status: 503 })
        : new Response(JSON.stringify(census), { status: 200 });
    }

    if (url.includes("wikidata.org")) {
      // Two calls: the item carrying the INSEE code, then its P18.
      const body = url.includes("wbgetclaims")
        ? options.noImage
          ? { claims: {} }
          : claims
        : search;

      return new Response(JSON.stringify(body), { status: 200 });
    }

    if (url.includes("commons.wikimedia.org")) {
      return options.commonsFails
        ? new Response("", { status: 500 })
        : new Response(JSON.stringify(commons), { status: 200 });
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

  it("has evidence behind every source that claims a figure", async () => {
    // A registry entry with nothing behind it claims a capability HomeGround
    // does not have. See specs/evidence.md.
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);
    const cited = new Set(area.evidence.map((f) => f.sourceId));
    const measuring = SOURCES.filter((s) => s.metrics.length > 0).map((s) => s.id);

    expect([...cited].sort()).toEqual(measuring.sort());
  });

  it("has something behind a source that supplies no figures", async () => {
    // Wikimedia supplies a photograph rather than a measurement. The rule is
    // the same: a listed source is one that is actually wired up.
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);

    for (const source of SOURCES.filter((s) => s.metrics.length === 0)) {
      expect(source.provides.length).toBeGreaterThanOrEqual(1);
    }

    expect(area.image).toMatchObject({ state: "known" });
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

describe("the commune photograph", () => {
  it("carries the credit its licence obliges", async () => {
    const { fetchImpl } = recordingFetch();
    const area = await getArea(db, CODE, fetchImpl);

    // Attribution and share-alike terms: an image without its artist is one
    // the interface may not lawfully display, so the two are stored together.
    expect(area.image).toEqual({
      state: "known",
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/FabrezanVillage.png?width=1200",
      artist: "Alricfabrezan",
      licence: "CC BY-SA 3.0",
      descriptionUrl: "https://commons.wikimedia.org/wiki/File:FabrezanVillage.png",
    });
  });

  it("is unknown for a commune nobody has photographed", async () => {
    const { fetchImpl } = recordingFetch({ noImage: true });
    const area = await getArea(db, CODE, fetchImpl);

    // Wikidata answered and holds none. An absence of photographers, and
    // everything else about the commune stands.
    expect(area.image).toEqual({ state: "unknown" });
    expect(area.evidence.length).toBeGreaterThan(0);
  });

  it("keeps the photograph but records no artist when the credit could not be read", async () => {
    const { fetchImpl } = recordingFetch({ commonsFails: true });
    const area = await getArea(db, CODE, fetchImpl);

    // Null is "not read", not "nobody to credit" — a difference the interface
    // states rather than papers over.
    expect(area.image).toMatchObject({ state: "known", artist: null });
    expect(area.image).toHaveProperty(
      "url",
      expect.stringContaining("FabrezanVillage.png") as unknown as string,
    );
  });

  it("does not let a missing picture fail the lookup", async () => {
    // Wikimedia is not asked for anything the research depends on.
    const fetchImpl = (async (input: unknown) => {
      const url = String(input);

      if (url.includes("wikidata") || url.includes("wikimedia")) {
        throw new Error("network down");
      }

      if (url.includes("melodi")) {
        return new Response(JSON.stringify(census), { status: 200 });
      }

      return new Response(JSON.stringify(commune), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const area = await getArea(db, CODE, fetchImpl);

    // Could not ask — which is not the same as nobody having photographed it,
    // and is not allowed to say so.
    expect(area.image).toEqual({ state: "unavailable" });
    expect(area.name).toBe("Fabrezan");
    expect(area.evidence.length).toBeGreaterThan(0);
  });
});
