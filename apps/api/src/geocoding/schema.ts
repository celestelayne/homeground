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
});

export const GeocodeQuerySchema = Type.Object(
  { q: Type.String({ minLength: 3 }) },
  { additionalProperties: false },
);

export const GeocodeResultSchema = Type.Object({
  candidates: Type.Array(GeocodeCandidateSchema),
});

export type GeocodeCandidate = Static<typeof GeocodeCandidateSchema>;
