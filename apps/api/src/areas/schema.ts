import { type Static, Type } from "@sinclair/typebox";

const Nullable = <T extends ReturnType<typeof Type.Number>>(inner: T) =>
  Type.Union([inner, Type.Null()]);

/**
 * The commune's administrative boundary, as GeoJSON.
 *
 * Declared explicitly rather than loosely: fast-json-stringify strips anything
 * a response schema does not describe, so a permissive type here would
 * serialise the geometry away.
 *
 * Served, not stored. Whether boundaries are persisted — and as PostGIS
 * geometry or as JSONB — is decided by the first milestone that needs to ask
 * questions of them rather than draw them.
 */
const Position = Type.Array(Type.Number());

const BoundarySchema = Type.Union([
  Type.Object({
    type: Type.Literal("Polygon"),
    coordinates: Type.Array(Type.Array(Position)),
  }),
  Type.Object({
    type: Type.Literal("MultiPolygon"),
    coordinates: Type.Array(Type.Array(Type.Array(Position))),
  }),
  Type.Null(),
]);

/** One measured or retrieved fact, with everything needed to trust it. */
export const EvidenceSchema = Type.Object({
  metric: Type.String(),
  /** Null exactly when the state carries absence. */
  value: Nullable(Type.Number()),
  unit: Type.Union([Type.String(), Type.Null()]),
  /**
   * What an authority designated, where a measurement carries a number:
   * "2_ZAC". In the authority's own words, never softened. Null on a
   * measurement, and a fact never carries both. See specs/evidence.md.
   */
  category: Type.Union([Type.String(), Type.Null()]),
  state: Type.Union([
    Type.Literal("known"),
    Type.Literal("estimated"),
    Type.Literal("unknown"),
    Type.Literal("unavailable"),
    Type.Literal("stale"),
  ]),
  sourceId: Type.String(),
  /** When the source observed it. Not when HomeGround fetched it. */
  observedAt: Type.Union([Type.String(), Type.Null()]),
  method: Type.String(),
  methodVersion: Type.Number(),
  /**
   * What a comparison was made against, in the words a reader sees, and how
   * many communes were in that group.
   *
   * Null on a plain measurement. Present together or not at all: a position
   * shown without the group it is a position among is not a fact, and the
   * storage constraint enforces the same rule. See specs/evidence.md.
   */
  basis: Type.Union([Type.String(), Type.Null()]),
  /** The classification that decided who the peers are. ADR-012. */
  basisSourceId: Type.Union([Type.String(), Type.Null()]),
  peers: Type.Union([Type.Number(), Type.Null()]),
});

/**
 * A located thing inside a commune — a pharmacy, a hospital.
 *
 * `precision` is the source's own statement about its coordinates, carried
 * rather than discarded: a facility placed at its commune is not at the point
 * its coordinate names. Same three words as a property's location tier,
 * because it is the same problem.
 */
export const FacilitySchema = Type.Object({
  id: Type.String(),
  kind: Type.Union([Type.Literal("pharmacy"), Type.Literal("hospital")]),
  name: Type.String(),
  /** Street line as the register writes it. Null when it gives none. */
  address: Type.Union([Type.String(), Type.Null()]),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  precision: Type.Union([Type.Literal("exact"), Type.Literal("zone"), Type.Literal("commune")]),
  sourceId: Type.String(),
});

/**
 * A French commune, as HomeGround can currently source it.
 *
 * Every field here is a fact from an authoritative service. Nothing is
 * narrative, and nothing is derived evidence — an Area is a subject that
 * evidence can be attached to, in the way a Property is. See ADR-003.
 */
export const AreaSchema = Type.Object({
  /** INSEE code. The identity of a commune; a postcode is not. */
  code: Type.String(),
  name: Type.String(),
  /** A commune can carry several, and several communes can share one. */
  postcodes: Type.Array(Type.String()),
  department: Type.Object({ code: Type.String(), name: Type.String() }),
  region: Type.Object({ code: Type.String(), name: Type.String() }),
  /**
   * The intercommunality this commune belongs to. Its name is often the only
   * sourced description of local character available — "CC Région Lézignanaise,
   * Corbières et Minervois" names two wine appellations.
   */
  intercommunality: Type.Union([
    Type.Object({ code: Type.String(), name: Type.String() }),
    Type.Null(),
  ]),
  centre: Type.Object({
    latitude: Type.Number({ minimum: -90, maximum: 90 }),
    longitude: Type.Number({ minimum: -180, maximum: 180 }),
  }),
  /** Null when the source gave no usable geometry. The rest still stands. */
  boundary: BoundarySchema,
  /**
   * What HomeGround has measured or retrieved about this commune, each piece
   * carrying where it came from. Figures are no longer fields on the commune:
   * a measurement without its provenance is an assertion. See
   * specs/evidence.md.
   */
  evidence: Type.Array(EvidenceSchema),
  /** Located things the sources place inside this commune. */
  facilities: Type.Array(FacilitySchema),
  /**
   * What the state records this commune as exposed to, each with how many
   * communes in France carry the same designation.
   *
   * Null when the national archive does not carry this commune at all, which
   * is not the same as a commune with nothing recorded — that is an empty
   * list. Twenty-four communes in the reference list are absent from the
   * archive entirely, and a commune created since its last edition is absent
   * too.
   */
  exposures: Type.Union([
    Type.Array(
      Type.Object({
        /** The authority's own code — "127" is differential settlement. */
        riskCode: Type.String(),
        /** The authority's own words, never softened. */
        label: Type.String(),
        prevalence: Type.Union([Type.Number(), Type.Null()]),
      }),
    ),
    Type.Null(),
  ]),
  /**
   * Natural disasters the state has declared here, most recent first. Null
   * carries the same meaning as above.
   */
  disasters: Type.Union([
    Type.Array(
      Type.Object({
        id: Type.String(),
        riskCode: Type.String(),
        label: Type.String(),
        /** When the episode began. Part of what identifies the declaration. */
        beganAt: Type.String(),
        /** When the order was signed. A different fact. */
        signedAt: Type.Union([Type.String(), Type.Null()]),
      }),
    ),
    Type.Null(),
  ]),
  /**
   * A photograph of the commune, contributed to Wikimedia Commons.
   *
   * Not evidence: it is whatever one person chose to point a camera at, so it
   * is honest as a photograph of the place and says nothing about the place as
   * a whole.
   *
   * Always present, because the absences differ. `unknown` is Wikidata
   * answering and holding no picture — a fact about photographers.
   * `unavailable` is Wikidata not answering, which is a fact about the network
   * and about nothing else.
   *
   * The credit is part of the image, not metadata about it. These files are
   * licensed on attribution and share-alike terms, so a response carrying the
   * URL without the artist would be one the client could not lawfully render.
   */
  image: Type.Union([
    Type.Object({
      state: Type.Literal("known"),
      url: Type.String(),
      /** Null means the credit could not be read, not that none is owed. */
      artist: Type.Union([Type.String(), Type.Null()]),
      licence: Type.Union([Type.String(), Type.Null()]),
      descriptionUrl: Type.Union([Type.String(), Type.Null()]),
    }),
    Type.Object({ state: Type.Literal("unknown") }),
    Type.Object({ state: Type.Literal("unavailable") }),
  ]),
});

export const AreaParamsSchema = Type.Object(
  { code: Type.String({ minLength: 2, maxLength: 5 }) },
  { additionalProperties: false },
);

export type Area = Static<typeof AreaSchema>;
export type Evidence = Static<typeof EvidenceSchema>;
export type Facility = Static<typeof FacilitySchema>;
export type Boundary = Static<typeof BoundarySchema>;
