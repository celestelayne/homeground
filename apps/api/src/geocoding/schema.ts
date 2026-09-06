import { type Static, Type } from "@sinclair/typebox";

export const GeocodeCandidateSchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
});

export const GeocodeQuerySchema = Type.Object(
  { q: Type.String({ minLength: 3 }) },
  { additionalProperties: false },
);

export const GeocodeResultSchema = Type.Object({
  candidates: Type.Array(GeocodeCandidateSchema),
});

export type GeocodeCandidate = Static<typeof GeocodeCandidateSchema>;
