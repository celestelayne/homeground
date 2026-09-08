import { type Static, Type } from "@sinclair/typebox";
import { LocationTierSchema } from "../properties/schema.js";

export const GeocodeCandidateSchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  /**
   * The best tier this result could support. A suggestion for the interface,
   * not a decision: specs/property.md requires the user to declare the tier.
   */
  precision: LocationTierSchema,
  /**
   * INSEE code of the commune this result falls in — "11132" for Fabrezan.
   *
   * This is the identity of a French commune. A postcode is not: 11200 covers
   * five communes, and commune names repeat across the country. It is also the
   * join key for INSEE, DVF and the commune boundary service.
   *
   * Null when the source did not give one. Never inferred from the label.
   */
  communeCode: Type.Union([Type.String(), Type.Null()]),
  /** The commune's own name, without the street that matched. */
  commune: Type.Union([Type.String(), Type.Null()]),
  /** "34, Hérault, Occitanie" — département and region, as IGN writes it. */
  context: Type.Union([Type.String(), Type.Null()]),
  postcode: Type.Union([Type.String(), Type.Null()]),
});

export const GeocodeQuerySchema = Type.Object(
  { q: Type.String({ minLength: 3 }) },
  { additionalProperties: false },
);

export const GeocodeResultSchema = Type.Object({
  candidates: Type.Array(GeocodeCandidateSchema),
});

export type GeocodeCandidate = Static<typeof GeocodeCandidateSchema>;
