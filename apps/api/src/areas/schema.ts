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
  /** Absent stays absent. A commune with no figure is not a commune of zero. */
  population: Nullable(Type.Number()),
  /** Square kilometres. The source publishes hectares. */
  areaSqKm: Nullable(Type.Number()),
  /** Residents per square kilometre, when both inputs are known. */
  densityPerSqKm: Nullable(Type.Number()),
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
});

export const AreaParamsSchema = Type.Object(
  { code: Type.String({ minLength: 2, maxLength: 5 }) },
  { additionalProperties: false },
);

export type Area = Static<typeof AreaSchema>;
export type Boundary = Static<typeof BoundarySchema>;
