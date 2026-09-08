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
  /** The commune's own name, without the street that matched. */
  commune: string | null;
  /** "34, Hérault, Occitanie" — département and region. */
  context: string | null;
  postcode: string | null;
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

/**
 * A located thing inside a commune.
 *
 * `precision` is the source's statement about its coordinates. A facility
 * placed at its commune is not at the point its coordinate names, and must
 * not be drawn as though it were.
 */
export interface Facility {
  id: string;
  kind: "pharmacy" | "hospital";
  name: string;
  /** Street line as the register writes it. Null when it gives none. */
  address: string | null;
  latitude: number;
  longitude: number;
  precision: "exact" | "zone" | "commune";
  sourceId: string;
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
  /** Located things the sources place inside this commune. */
  facilities: Facility[];
  /** GeoJSON, [longitude, latitude]. Null when the source gave none usable. */
  boundary:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] }
    | null;
  /**
   * A photograph contributed to Wikimedia Commons.
   *
   * Not evidence — it is what one person chose to photograph. The two
   * absences differ and are worded differently: `unknown` is Wikidata
   * answering and holding no picture, `unavailable` is Wikidata not
   * answering.
   *
   * The credit comes with the URL because the licence requires it to be shown
   * with the picture. A null artist means the credit could not be read, not
   * that none is owed.
   */
  image:
    | {
        state: "known";
        url: string;
        artist: string | null;
        licence: string | null;
        descriptionUrl: string | null;
      }
    | { state: "unknown" }
    | { state: "unavailable" };
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
  /** What it supplies that is not a measurement, in plain words. */
  provides: string[];
}
