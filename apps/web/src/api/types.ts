/**
 * The wire shape of a Property, mirroring the API's contract.
 *
 * Deliberately duplicated rather than shared: docs/architecture.md prefers
 * explicit duplication until the boundary is clear, and the shapes genuinely
 * differ across layers. A test asserts both sides carry the same fields.
 */
export type PropertyStatus = "saved" | "shortlist" | "visit" | "rejected";

export type LocationTier = "exact" | "zone" | "commune";

export interface Property {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  locationTier: LocationTier;
  askingPrice: number | null;
  listingUrl: string | null;
  status: PropertyStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeocodeCandidate {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** The best tier this result could support. A suggestion, not a decision. */
  precision: LocationTier;
  /**
   * INSEE code of the commune — "11132" for Fabrezan. What identifies a French
   * commune; a postcode does not. Null when the source did not give one.
   */
  communeCode: string | null;
}

/**
 * A French commune. The subject of area-level research, and what a listing
 * that withholds an address actually tells you.
 *
 * Every field is sourced. There is deliberately no prose description: the
 * services HomeGround uses publish none, and ADR-004 forbids inventing
 * geography.
 */
/** One measured or retrieved fact, with everything needed to trust it. */
export interface Evidence {
  metric: string;
  /** Null exactly when the state carries absence. */
  value: number | null;
  unit: string | null;
  state: "known" | "estimated" | "unknown" | "unavailable" | "stale";
  sourceId: string;
  /** When the source observed it. Not when HomeGround fetched it. */
  observedAt: string | null;
  method: string;
  methodVersion: number;
}

export interface Area {
  /** INSEE code — the identity of a commune. A postcode is not. */
  code: string;
  name: string;
  postcodes: string[];
  department: { code: string; name: string };
  region: { code: string; name: string };
  intercommunality: { code: string; name: string } | null;
  centre: { latitude: number; longitude: number };
  /** Figures are no longer fields: a measurement without provenance is an assertion. */
  evidence: Evidence[];
  /** GeoJSON, [longitude, latitude]. Null when the source gave none usable. */
  boundary:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] }
    | null;
}

export interface CreateProperty {
  name: string;
  latitude: number;
  longitude: number;
  locationTier: LocationTier;
  address?: string | null;
  askingPrice?: number | null;
  listingUrl?: string | null;
}

export interface UpdateProperty {
  name?: string;
  status?: PropertyStatus;
  notes?: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}

/**
 * A source, as the Sources and methodology panel shows it.
 *
 * `limitations` is never empty. Every source misleads somebody, and saying how
 * is a condition of using it rather than something a user discovers.
 */
export interface Source {
  id: string;
  name: string;
  publisher: string;
  description: string;
  url: string;
  cadence: string;
  coverage: string;
  licence: string;
  limitations: string[];
  /** The metrics this source is the origin of. */
  metrics: string[];
}
