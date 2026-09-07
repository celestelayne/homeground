import type { LocationTier } from "../properties/schema.js";
import type { GeocodeCandidate } from "./schema.js";

/**
 * IGN's Géoplateforme, which serves the Base Adresse Nationale. No API key.
 * See ADR-010. This moved from api-adresse.data.gouv.fr in January 2026, which
 * is why provider-specific handling is confined to this file.
 */
const ENDPOINT = "https://data.geopf.fr/geocodage/search";
const TIMEOUT_MS = 5000;
const MAX_CANDIDATES = 5;

/**
 * Raised when the geocoder could not answer. Distinct from answering with no
 * matches: "unable to determine" and "none identified" are different facts,
 * and docs/methodology.md forbids collapsing the first into the second.
 */
export class GeocoderUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GeocoderUnavailableError";
  }
}

export type FetchLike = typeof globalThis.fetch;

/**
 * What each IGN result type can support. An unrecognised type falls to the
 * least precise tier, so a change at the source can never silently overstate
 * how well a property is located.
 */
const PRECISION_BY_TYPE: Record<string, LocationTier> = {
  housenumber: "exact",
  street: "zone",
  locality: "zone",
  municipality: "commune",
};

function precisionOf(type: unknown): LocationTier {
  return (typeof type === "string" && PRECISION_BY_TYPE[type]) || "commune";
}

/** The network call. Every failure mode becomes GeocoderUnavailableError. */
export async function fetchGeocode(
  query: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<unknown> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(MAX_CANDIDATES));

  let response: Response;

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (cause) {
    throw new GeocoderUnavailableError("Address lookup did not respond", { cause });
  }

  if (!response.ok) {
    throw new GeocoderUnavailableError(`Address lookup returned ${response.status}`);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new GeocoderUnavailableError("Address lookup returned an unreadable body", { cause });
  }
}

/**
 * Maps IGN's GeoJSON to HomeGround candidates. Pure, so it is testable against
 * a recorded response with no network.
 *
 * A feature that cannot be read is dropped rather than defaulted. ADR-004
 * forbids inventing geography, and a guessed coordinate is worse than one
 * fewer candidate.
 */
export function toCandidates(payload: unknown): GeocodeCandidate[] {
  const features = (payload as { features?: unknown } | null)?.features;

  if (!Array.isArray(features)) {
    throw new GeocoderUnavailableError("Address lookup returned an unrecognised shape");
  }

  const candidates: GeocodeCandidate[] = [];

  for (const feature of features) {
    const candidate = toCandidate(feature);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function toCandidate(feature: unknown): GeocodeCandidate | null {
  const typed = feature as {
    properties?: { label?: unknown; id?: unknown; type?: unknown; citycode?: unknown };
    geometry?: { coordinates?: unknown };
  } | null;

  const label = typed?.properties?.label;
  const coordinates = typed?.geometry?.coordinates;

  if (typeof label !== "string" || label.length === 0) {
    return null;
  }

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  // GeoJSON orders coordinates [longitude, latitude]; HomeGround stores them
  // the other way round. Reversing them silently relocates French properties.
  const [longitude, latitude] = coordinates;

  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return null;
  }

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const id =
    typeof typed?.properties?.id === "string" ? typed.properties.id : `${longitude},${latitude}`;

  // IGN calls it citycode; it is the INSEE code. Absent stays absent — an
  // INSEE code guessed from a label would key evidence to the wrong commune.
  const citycode = typed?.properties?.citycode;
  const communeCode = typeof citycode === "string" && citycode.length > 0 ? citycode : null;

  return {
    id,
    label,
    latitude,
    longitude,
    precision: precisionOf(typed?.properties?.type),
    communeCode,
  };
}
