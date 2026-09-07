import type { FetchLike } from "../geocoding/ign.js";
import type { Area, Boundary } from "./schema.js";

/**
 * geo.api.gouv.fr — the French government's commune reference, built on INSEE
 * and IGN data. No API key. Provider-specific handling is confined to this
 * file, as ADR-002 requires of every provider.
 */
const ENDPOINT = "https://geo.api.gouv.fr/communes";
const TIMEOUT_MS = 5000;
// The contour comes in the same request as the facts. Two requests would be
// two chances to be rate-limited, and the service does rate-limit.
const FIELDS = "nom,code,codesPostaux,population,surface,centre,contour,departement,region,epci";

/** Raised when the service could not answer. Distinct from answering "no such commune". */
export class AreaLookupUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AreaLookupUnavailableError";
  }
}

/** Raised when the service answered, and no commune has that code. */
export class AreaNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AreaNotFoundError";
  }
}

export async function fetchCommune(
  code: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<unknown> {
  const url = new URL(`${ENDPOINT}/${encodeURIComponent(code)}`);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("format", "json");

  let response: Response;

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (cause) {
    throw new AreaLookupUnavailableError("Commune lookup did not respond", { cause });
  }

  // A 404 is an answer: this code identifies no commune. Every other failure
  // means the service could not answer, and docs/methodology.md forbids
  // collapsing those two into one.
  if (response.status === 404) {
    throw new AreaNotFoundError(`No commune with code ${code}`);
  }

  if (!response.ok) {
    throw new AreaLookupUnavailableError(`Commune lookup returned ${response.status}`);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new AreaLookupUnavailableError("Commune lookup returned an unreadable body", { cause });
  }
}

const HECTARES_PER_SQ_KM = 100;

/** Pure, so it is testable against a recorded response with no network. */
export function toArea(payload: unknown): Area {
  const c = payload as {
    nom?: unknown;
    code?: unknown;
    codesPostaux?: unknown;
    population?: unknown;
    surface?: unknown;
    centre?: { coordinates?: unknown };
    contour?: unknown;
    departement?: { code?: unknown; nom?: unknown };
    region?: { code?: unknown; nom?: unknown };
    epci?: { code?: unknown; nom?: unknown };
  } | null;

  const code = str(c?.code);
  const name = str(c?.nom);

  if (!code || !name) {
    throw new AreaLookupUnavailableError("Commune lookup returned an unrecognised shape");
  }

  const centre = toCentre(c?.centre?.coordinates);

  if (!centre) {
    throw new AreaLookupUnavailableError("Commune lookup returned no usable centre");
  }

  const population = num(c?.population);
  const hectares = num(c?.surface);
  const areaSqKm = hectares === null ? null : round(hectares / HECTARES_PER_SQ_KM, 2);

  return {
    code,
    name,
    postcodes: Array.isArray(c?.codesPostaux) ? c.codesPostaux.filter(isNonEmptyString) : [],
    population,
    areaSqKm,
    // Only when both inputs are known. A density computed from a missing
    // population would read as a real measurement of an empty place.
    densityPerSqKm:
      population === null || areaSqKm === null || areaSqKm === 0
        ? null
        : round(population / areaSqKm, 1),
    department: pair(c?.departement) ?? { code: "", name: "" },
    region: pair(c?.region) ?? { code: "", name: "" },
    intercommunality: pair(c?.epci),
    centre,
    boundary: toBoundary(c?.contour),
  };
}

/**
 * A boundary HomeGround cannot read becomes no boundary, not a partial one.
 * Half a commune outline drawn on a map is a false statement about where the
 * commune is.
 */
function toBoundary(contour: unknown): Boundary {
  const geometry = contour as { type?: unknown; coordinates?: unknown } | null;

  if (!Array.isArray(geometry?.coordinates)) {
    return null;
  }

  if (geometry.type === "Polygon" && geometry.coordinates.every(isRing)) {
    return { type: "Polygon", coordinates: geometry.coordinates };
  }

  if (
    geometry.type === "MultiPolygon" &&
    geometry.coordinates.every((polygon) => Array.isArray(polygon) && polygon.every(isRing))
  ) {
    return { type: "MultiPolygon", coordinates: geometry.coordinates };
  }

  return null;
}

function isRing(ring: unknown): ring is number[][] {
  return (
    Array.isArray(ring) &&
    ring.length > 0 &&
    ring.every(
      (position) =>
        Array.isArray(position) &&
        position.length >= 2 &&
        position.every((n) => typeof n === "number" && Number.isFinite(n)),
    )
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function str(value: unknown): string | null {
  return isNonEmptyString(value) ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;

  return Math.round(value * factor) / factor;
}

function pair(value: { code?: unknown; nom?: unknown } | undefined) {
  const code = str(value?.code);
  const name = str(value?.nom);

  return code && name ? { code, name } : null;
}

function toCentre(coordinates: unknown): { latitude: number; longitude: number } | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  // GeoJSON orders coordinates [longitude, latitude].
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

  return { latitude, longitude };
}
