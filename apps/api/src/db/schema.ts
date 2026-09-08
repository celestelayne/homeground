import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The four statuses in specs/property.md. The set is closed by specification,
 * so it is a database type rather than a constraint that a later migration
 * could quietly drop.
 */
export const propertyStatus = pgEnum("property_status", [
  "saved",
  "shortlist",
  "visit",
  "rejected",
]);

/**
 * How precisely the stored coordinates identify the property. Declared by the
 * user, never inferred. There is deliberately no default: a Property cannot be
 * saved without an explicit tier. See specs/property.md.
 */
export const locationTier = pgEnum("location_tier", ["exact", "zone", "commune"]);

/**
 * Exactly the fields specs/property.md defines. Derived evidence never becomes
 * a column here — see ADR-003.
 */
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // What the user calls this property. Required: it is the one value they
    // always have, and it is what tells two properties in one commune apart.
    name: text("name").notNull(),
    // Optional: many rural properties have no postal address at all.
    address: text("address"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    locationTier: locationTier("location_tier").notNull(),
    askingPrice: numeric("asking_price", { precision: 12, scale: 2 }),
    listingUrl: text("listing_url"),
    status: propertyStatus("status").notNull().default("saved"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // The confirmed-coordinates invariant, restated in storage so it holds for
  // any write path, not only the HTTP handler.
  (table) => [
    check("properties_latitude_range", sql`${table.latitude} between -90 and 90`),
    check("properties_longitude_range", sql`${table.longitude} between -180 and 180`),
  ],
);

/**
 * What a piece of evidence is. See specs/evidence.md.
 *
 * `unknown` and `unavailable` are separate states and never collapse into one
 * another: "this commune has no pharmacy" and "we could not find out" lead a
 * buyer to opposite conclusions. `estimated` covers values a source itself
 * publishes as estimates, such as weighted census figures, and values located
 * only to a commune when the thing being located is smaller.
 */
export const evidenceState = pgEnum("evidence_state", [
  "known",
  "estimated",
  "unknown",
  "unavailable",
  "stale",
]);

/**
 * The registry every piece of evidence cites, and the only origin of the
 * Sources and methodology panel. The panel is rendered from these rows, never
 * written as page copy, so it cannot describe a source that is not wired up.
 */
export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    publisher: text("publisher").notNull(),
    description: text("description").notNull(),
    url: text("url").notNull(),
    /** How often the publisher republishes: "annual", "continuous". */
    cadence: text("cadence").notNull(),
    /** Where it applies, and where it does not. */
    coverage: text("coverage").notNull(),
    licence: text("licence").notNull(),
    limitations: text("limitations").array().notNull(),
  },
  // Every source misleads somebody. Requiring the limitation in storage makes
  // saying so a condition of using the source rather than something a user
  // discovers. See specs/evidence.md.
  //
  // cardinality, not array_length: array_length returns null for an empty
  // array, and a check constraint evaluating to null passes. The first version
  // of this let a source with no limitations straight through.
  (table) => [check("sources_state_a_limitation", sql`cardinality(${table.limitations}) >= 1`)],
);

/**
 * A French commune: the subject evidence attaches to, identified by its INSEE
 * code. Held rather than proxied, so a commune is fetched once.
 *
 * Identity and location only. Population, surface and density are measurements
 * and live in `evidence` with their provenance — the same rule that keeps
 * derived evidence off `properties`. See ADR-003.
 */
export const areas = pgTable("areas", {
  /** INSEE code. A postcode is not an identity: 11200 covers five communes. */
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  postcodes: text("postcodes").array().notNull(),
  departmentCode: text("department_code").notNull(),
  departmentName: text("department_name").notNull(),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  intercommunalityCode: text("intercommunality_code"),
  intercommunalityName: text("intercommunality_name"),
  centreLatitude: doublePrecision("centre_latitude").notNull(),
  centreLongitude: doublePrecision("centre_longitude").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A commune's administrative boundary, kept so that looking one up twice does
 * not fetch it twice. M2 requires that, and geo.api.gouv.fr rate-limits in
 * ordinary use.
 *
 * Separate from `areas`, and the column is `geojson` rather than `geometry`,
 * because this is a serialised blob for drawing and nothing more. ADR-005
 * warns that a boundary sitting in an ordinary column invites hand-rolled
 * containment logic; keeping it in its own table means anything reaching for
 * containment has to visibly join for it rather than find it beside a
 * commune's name.
 *
 * M5 introduces PostGIS and replaces this with real geometry. Until then
 * nothing queries it: no containment, no intersection, no distance.
 */
export const areaBoundaries = pgTable("area_boundaries", {
  code: text("code")
    .primaryKey()
    .references(() => areas.code, { onDelete: "cascade" }),
  geojson: jsonb("geojson").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One measured or retrieved fact about an Area.
 *
 * Never a judgment, never a comparison. See specs/evidence.md.
 */
export const evidence = pgTable(
  "evidence",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    areaCode: text("area_code")
      .notNull()
      .references(() => areas.code, { onDelete: "cascade" }),
    /** What is measured: "population", "dwellings.second_home_share". */
    metric: text("metric").notNull(),
    /** Null exactly when the state carries absence. */
    value: doublePrecision("value"),
    unit: text("unit"),
    state: evidenceState("state").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    /** When the source observed it. Not when HomeGround fetched it. */
    observedAt: timestamp("observed_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    method: text("method").notNull(),
    methodVersion: integer("method_version").notNull(),
  },
  (table) => [
    /**
     * Absence is never a value. A commune with no data is not a commune of no
     * people with no shops, so a state that means "we have no figure" cannot
     * carry one — and a state that means we do must.
     */
    check(
      "evidence_absence_has_no_value",
      sql`(${table.state} in ('unknown', 'unavailable') and ${table.value} is null and ${table.unit} is null)
          or (${table.state} in ('known', 'estimated', 'stale') and ${table.value} is not null and ${table.unit} is not null)`,
    ),
    /**
     * One figure per metric per observation period. Two indexes rather than
     * one: Postgres treats nulls as distinct, so a row with no observation
     * date — an `unknown`, which has nothing to date — would otherwise be
     * insertable twice.
     */
    uniqueIndex("evidence_one_per_observation").on(table.areaCode, table.metric, table.observedAt),
    uniqueIndex("evidence_one_undated_per_metric")
      .on(table.areaCode, table.metric)
      .where(sql`${table.observedAt} is null`),
    index("evidence_by_area").on(table.areaCode, table.metric),
  ],
);

/**
 * How precisely a facility's coordinates identify it.
 *
 * Deliberately the same three words `specs/property.md` uses for a property's
 * location, because it is the same problem: a coordinate that looks precise
 * and is not is worse than no coordinate. FINESS publishes a geocoding level
 * with every establishment, and around four per cent of pharmacies resolve
 * only to their commune.
 */
export const facilityPrecision = pgEnum("facility_precision", ["exact", "zone", "commune"]);

/** What kind of place it is. Closed by what HomeGround has mappings for. */
export const facilityKind = pgEnum("facility_kind", ["pharmacy", "hospital"]);

/**
 * A located thing retrieved from a source — a pharmacy, a hospital.
 *
 * Not evidence: evidence is a measurement with a value and a unit, and a
 * pharmacy has neither. It is a subject with a position, and the counts
 * derived from these rows are what become evidence. See specs/evidence.md.
 */
export const facilities = pgTable(
  "facilities",
  {
    /** The source's own identifier. FINESS numbers are stable. */
    id: text("id").primaryKey(),
    /**
     * The INSEE code the source places it in.
     *
     * Deliberately not a foreign key to `areas`. FINESS is a national file
     * ingested in one pass, while `areas` holds only the communes somebody has
     * looked up — so almost every facility would reference a commune that does
     * not exist yet. The facilities wait for the commune rather than the other
     * way round.
     */
    areaCode: text("area_code").notNull(),
    kind: facilityKind("kind").notNull(),
    name: text("name").notNull(),
    /** Street line as the register writes it. Absent for some establishments. */
    address: text("address"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    /** Never inferred: the source states it. */
    precision: facilityPrecision("precision").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("facilities_latitude_range", sql`${table.latitude} between -90 and 90`),
    check("facilities_longitude_range", sql`${table.longitude} between -180 and 180`),
    index("facilities_by_area").on(table.areaCode, table.kind),
  ],
);
