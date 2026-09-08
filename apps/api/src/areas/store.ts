import { and, count, eq, inArray, like } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { areaBoundaries, areas, evidence, facilities, sources } from "../db/schema.js";
import type { FetchLike } from "../geocoding/ign.js";
import { SOURCES } from "../sources/registry.js";
import { fetchCommuneImage } from "../wikidata/commune-image.js";
import { CENSUS_METHOD, CENSUS_METHOD_VERSION, fetchCensus, toCensusFigures } from "./census.js";
import { declarationsOf, EXPOSURE_METHODS, exposureEvidence, exposuresOf } from "./exposure.js";
import { AreaLookupUnavailableError, fetchCommune, toCommune } from "./geo-api.js";
import type { Area, Evidence, Facility } from "./schema.js";

const GEO_METHOD = "geo-api-commune";
const GEO_METHOD_VERSION = 1;

/** Registers the sources rows, so evidence has something to cite. */
export async function registerSources(db: Db): Promise<void> {
  for (const source of SOURCES) {
    const { metrics: _metrics, ...row } = source;

    await db.insert(sources).values(row).onConflictDoUpdate({ target: sources.id, set: row });
  }
}

/**
 * A commune with its evidence.
 *
 * Fetched from the upstream services the first time it is asked for and held
 * afterwards, which is what M2 requires and what the rate limiting demands:
 * geo.api.gouv.fr and INSEE both throttle in ordinary use.
 */
export async function getArea(db: Db, code: string, fetchImpl?: FetchLike): Promise<Area> {
  const held = await read(db, code);

  if (held) {
    return held;
  }

  await store(db, code, fetchImpl);

  const stored = await read(db, code);

  if (!stored) {
    throw new AreaLookupUnavailableError("Commune was fetched but could not be read back");
  }

  return stored;
}

async function read(db: Db, code: string): Promise<Area | null> {
  const [row] = await db.select().from(areas).where(eq(areas.code, code)).limit(1);

  if (!row) {
    return null;
  }

  const [boundaryRow] = await db
    .select()
    .from(areaBoundaries)
    .where(eq(areaBoundaries.code, code))
    .limit(1);

  const facts = await db.select().from(evidence).where(eq(evidence.areaCode, code));
  // Read from HomeGround's own national tables, the way facilities are.
  const exposures = await exposuresOf(db, code);
  const disasters = await declarationsOf(db, code);

  return {
    code: row.code,
    name: row.name,
    postcodes: row.postcodes,
    department: { code: row.departmentCode, name: row.departmentName },
    region: { code: row.regionCode, name: row.regionName },
    intercommunality:
      row.intercommunalityCode && row.intercommunalityName
        ? { code: row.intercommunalityCode, name: row.intercommunalityName }
        : null,
    centre: { latitude: row.centreLatitude, longitude: row.centreLongitude },
    boundary: (boundaryRow?.geojson ?? null) as Area["boundary"],
    // The credit travels with the picture. Reading one without the other is
    // not possible from here, which is the point.
    image:
      row.imageState === "known" && row.imageUrl
        ? {
            state: "known" as const,
            url: row.imageUrl,
            artist: row.imageArtist,
            licence: row.imageLicence,
            descriptionUrl: row.imageDescriptionUrl,
          }
        : { state: row.imageState === "unknown" ? ("unknown" as const) : ("unavailable" as const) },
    facilities: (await db.select().from(facilities).where(eq(facilities.areaCode, code))).map(
      (row): Facility => ({
        id: row.id,
        kind: row.kind,
        name: row.name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        precision: row.precision,
        sourceId: row.sourceId,
      }),
    ),
    exposures,
    disasters,
    evidence: facts
      .map(
        (fact): Evidence => ({
          metric: fact.metric,
          value: fact.value,
          unit: fact.unit,
          category: fact.category,
          state: fact.state,
          sourceId: fact.sourceId,
          observedAt: fact.observedAt ? fact.observedAt.toISOString() : null,
          method: fact.method,
          methodVersion: fact.methodVersion,
          // A comparison carries what it was compared against, or it carries
          // nothing and is a plain measurement.
          basis: fact.basis,
          basisSourceId: fact.basisSourceId,
          peers: fact.peers,
        }),
      )
      .sort(
        (a, b) =>
          a.metric.localeCompare(b.metric) ||
          (a.observedAt ?? "").localeCompare(b.observedAt ?? ""),
      ),
  };
}

async function store(db: Db, code: string, fetchImpl?: FetchLike): Promise<void> {
  const commune = toCommune(await fetchCommune(code, fetchImpl));
  // Never throws: a commune nobody has photographed and a Wikimedia that did
  // not answer both come back as a state. Neither is worth failing a lookup
  // over — the commune is no less researched without its picture.
  const image = await fetchCommuneImage(code, fetchImpl);

  await db.insert(areas).values({
    code: commune.code,
    name: commune.name,
    postcodes: commune.postcodes,
    departmentCode: commune.department.code,
    departmentName: commune.department.name,
    regionCode: commune.region.code,
    regionName: commune.region.name,
    intercommunalityCode: commune.intercommunality?.code ?? null,
    intercommunalityName: commune.intercommunality?.name ?? null,
    centreLatitude: commune.centre.latitude,
    centreLongitude: commune.centre.longitude,
    imageState: image.state,
    imageUrl: image.state === "known" ? image.url : null,
    imageArtist: image.state === "known" ? image.artist : null,
    imageLicence: image.state === "known" ? image.licence : null,
    imageDescriptionUrl: image.state === "known" ? image.descriptionUrl : null,
  });

  if (commune.boundary) {
    await db.insert(areaBoundaries).values({ code: commune.code, geojson: commune.boundary });
  }

  const rows = [
    ...administrativeEvidence(code, commune),
    ...(await censusEvidence(code, fetchImpl)),
    ...(await facilityEvidence(db, code)),
    ...(await exposureEvidence(db, code)),
  ];

  if (rows.length > 0) {
    await db.insert(evidence).values(rows);
  }
}

/** What the administrative reference publishes about a commune. */
function administrativeEvidence(code: string, commune: ReturnType<typeof toCommune>) {
  const measured = (metric: string, value: number | null, unit: string) =>
    value === null
      ? {
          areaCode: code,
          metric,
          value: null,
          unit: null,
          // The source answered and had no figure. Not a failure, and not zero.
          state: "unknown" as const,
          sourceId: "geo-api-gouv",
          observedAt: null,
          method: GEO_METHOD,
          methodVersion: GEO_METHOD_VERSION,
        }
      : {
          areaCode: code,
          metric,
          value,
          unit,
          state: "known" as const,
          sourceId: "geo-api-gouv",
          observedAt: null,
          method: GEO_METHOD,
          methodVersion: GEO_METHOD_VERSION,
        };

  return [
    measured("population", commune.population, "residents"),
    measured("area.sqKm", commune.areaSqKm, "km²"),
    measured("population.density", commune.densityPerSqKm, "residents per km²"),
  ];
}

/**
 * Census figures, or a single `unavailable` marker.
 *
 * A census service that cannot answer must not make the commune's other
 * evidence disappear: one failed source does not invalidate the rest of an
 * assessment. docs/methodology.md, and it is why this is caught here rather
 * than allowed to fail the whole lookup.
 */
const CENSUS_METRICS = [
  "dwellings.main",
  "dwellings.secondHome",
  "dwellings.vacant",
  "dwellings.secondHomeShare",
];

async function censusEvidence(code: string, fetchImpl?: FetchLike) {
  try {
    const figures = toCensusFigures(await fetchCensus(code, fetchImpl));

    if (figures.length === 0) {
      // The census answered and had nothing for this commune. Recording no
      // rows would leave the metrics indistinguishable from ones nobody asked
      // about; recording zeros would invent a commune with no housing.
      return CENSUS_METRICS.map((metric) => ({
        areaCode: code,
        metric,
        value: null,
        unit: null,
        state: "unknown" as const,
        sourceId: "insee-census",
        observedAt: null,
        method: CENSUS_METHOD,
        methodVersion: CENSUS_METHOD_VERSION,
      }));
    }

    return figures.map((figure) => ({
      areaCode: code,
      metric: figure.metric,
      value: figure.value,
      unit: figure.unit,
      // INSEE publishes these as weighted estimates, with decimals. Calling
      // them known would launder an estimate into a count.
      state: "estimated" as const,
      sourceId: "insee-census",
      observedAt: figure.observedAt,
      method: figure.method,
      methodVersion: figure.methodVersion,
    }));
  } catch {
    return [
      {
        areaCode: code,
        metric: "dwellings.secondHomeShare",
        value: null,
        unit: null,
        // Could not ask. Different from asking and being told nothing.
        state: "unavailable" as const,
        sourceId: "insee-census",
        observedAt: null,
        method: CENSUS_METHOD,
        methodVersion: CENSUS_METHOD_VERSION,
      },
    ];
  }
}

const FINESS_METHOD = "finess-facility-count";
const FINESS_METHOD_VERSION = 1;

/**
 * How many hospitals and pharmacies FINESS places in this commune.
 *
 * Counting nothing is only a finding once the directory has been ingested.
 * Before that, zero pharmacies would be a claim about the commune when it is
 * really a statement about HomeGround, so the count is Unknown instead.
 */
async function facilityEvidence(db: Db, code: string) {
  // Zero facilities is a finding only where the directory reaches. The
  // geolocated extract carries no overseas establishments at all, so counting
  // none in Mayotte says nothing about Mayotte — it says the source stopped at
  // the Channel. Asking whether it holds anything in this commune's département
  // decides that from the data rather than from a hardcoded list of territories.
  const department = code.startsWith("97") ? code.slice(0, 3) : code.slice(0, 2);
  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(facilities)
    .where(like(facilities.areaCode, `${department}%`));
  const covered = total > 0;

  const here = covered
    ? await db
        .select({ kind: facilities.kind, found: count() })
        .from(facilities)
        .where(eq(facilities.areaCode, code))
        .groupBy(facilities.kind)
    : [];

  const counted = (kind: "pharmacy" | "hospital") =>
    here.find((row) => row.kind === kind)?.found ?? 0;

  return (
    [
      ["health.pharmacies", "pharmacy", "pharmacies"],
      ["health.hospitals", "hospital", "hospitals"],
    ] as const
  ).map(([metric, kind, unit]) => ({
    areaCode: code,
    metric,
    value: covered ? counted(kind) : null,
    unit: covered ? unit : null,
    state: covered ? ("known" as const) : ("unknown" as const),
    sourceId: "finess",
    observedAt: null,
    method: FINESS_METHOD,
    methodVersion: FINESS_METHOD_VERSION,
  }));
}

/**
 * Recomputes the exposure evidence of every commune already held.
 *
 * A commune is fetched once and held, so an ingest that brings a new archive
 * would otherwise leave the communes already looked up citing counts nobody
 * holds. The designations and declarations themselves are read from the
 * national tables at request time and need no refresh.
 */
export async function refreshExposure(db: Db): Promise<number> {
  const held = await db.select({ code: areas.code }).from(areas);

  for (const { code } of held) {
    const rows = await exposureEvidence(db, code);

    await db.transaction(async (tx) => {
      await tx
        .delete(evidence)
        .where(and(eq(evidence.areaCode, code), inArray(evidence.method, EXPOSURE_METHODS)));

      if (rows.length > 0) {
        await tx.insert(evidence).values(rows);
      }
    });
  }

  return held.length;
}
