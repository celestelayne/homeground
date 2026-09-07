import type { FetchLike } from "../geocoding/ign.js";
import { AreaLookupUnavailableError } from "./geo-api.js";

/**
 * INSEE's melodi API, which serves census results. No API key.
 *
 * Every dimension is pinned to its total except the two that matter, because
 * the unfiltered dataset returns around 250 cross-tabulated observations per
 * commune and this needs twelve.
 */
const ENDPOINT = "https://api.insee.fr/melodi/data/DS_RP_LOGEMENT_PRINC";
const TIMEOUT_MS = 8000;
const TOTALS = ["CARS", "BUILD_END", "NRG_SRC", "TDW", "TSH", "CARPARK", "NOR", "L_STAY"];

/** Occupancy statuses, in INSEE's vocabulary. */
const OCCUPANCY: Record<string, string> = {
  DW_MAIN: "dwellings.main",
  DW_SEC_DW_OCC: "dwellings.secondHome",
  DW_VAC: "dwellings.vacant",
};

/** How the figures are produced. Bump when the derivation changes. */
export const CENSUS_METHOD = "insee-census-dwellings";
export const CENSUS_METHOD_VERSION = 1;
export const SHARE_METHOD = "second-home-share-of-all-dwellings";
export const SHARE_METHOD_VERSION = 1;

export interface CensusFigure {
  metric: string;
  value: number;
  unit: string;
  observedAt: Date;
  method: string;
  methodVersion: number;
}

export async function fetchCensus(
  code: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<unknown> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("GEO", `COM-${code}`);
  url.searchParams.set("RP_MEASURE", "DWELLINGS");

  for (const dimension of TOTALS) {
    url.searchParams.set(dimension, "_T");
  }

  let response: Response;

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (cause) {
    throw new AreaLookupUnavailableError("Census lookup did not respond", { cause });
  }

  if (!response.ok) {
    throw new AreaLookupUnavailableError(`Census lookup returned ${response.status}`);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new AreaLookupUnavailableError("Census lookup returned an unreadable body", { cause });
  }
}

/**
 * Maps melodi observations to figures. Pure, so it is testable against a
 * recorded response with no network.
 *
 * Values arrive as weighted estimates carrying decimals — 624.5973 dwellings,
 * not 625. They are stored as published. Rounding is a presentation decision
 * recorded in the method, not something done on the way in, because rounding
 * before deriving a share gives a different share.
 */
export function toCensusFigures(payload: unknown): CensusFigure[] {
  const observations = (payload as { observations?: unknown } | null)?.observations;

  if (!Array.isArray(observations)) {
    throw new AreaLookupUnavailableError("Census lookup returned an unrecognised shape");
  }

  const figures: CensusFigure[] = [];
  /** Totals per year, so the share can be derived once every part is known. */
  const byYear = new Map<string, Map<string, number>>();

  for (const observation of observations) {
    const reading = toReading(observation);

    if (!reading) {
      continue;
    }

    const { year, occupancy, value } = reading;
    const metric = OCCUPANCY[occupancy];

    if (metric) {
      figures.push({
        metric,
        value,
        unit: "dwellings",
        observedAt: new Date(`${year}-01-01T00:00:00Z`),
        method: CENSUS_METHOD,
        methodVersion: CENSUS_METHOD_VERSION,
      });
    }

    if (metric || occupancy === "_T") {
      const year_ = byYear.get(year) ?? new Map<string, number>();
      year_.set(occupancy, value);
      byYear.set(year, year_);
    }
  }

  for (const [year, parts] of byYear) {
    const total = parts.get("_T");
    const secondHomes = parts.get("DW_SEC_DW_OCC");

    // A share of nothing is not zero, it is nothing.
    if (total === undefined || secondHomes === undefined || total <= 0) {
      continue;
    }

    figures.push({
      metric: "dwellings.secondHomeShare",
      // Derived from the published values, not from rounded ones: rounding the
      // parts first moves the share, and two parts of the application would
      // then disagree about the same commune.
      value: (secondHomes / total) * 100,
      unit: "%",
      observedAt: new Date(`${year}-01-01T00:00:00Z`),
      method: SHARE_METHOD,
      methodVersion: SHARE_METHOD_VERSION,
    });
  }

  return figures;
}

function toReading(
  observation: unknown,
): { year: string; occupancy: string; value: number } | null {
  const typed = observation as {
    dimensions?: { TIME_PERIOD?: unknown; OCS?: unknown };
    measures?: { OBS_VALUE_NIVEAU?: { value?: unknown } };
  } | null;

  const year = typed?.dimensions?.TIME_PERIOD;
  const occupancy = typed?.dimensions?.OCS;
  const value = typed?.measures?.OBS_VALUE_NIVEAU?.value;

  if (typeof year !== "string" || typeof occupancy !== "string") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return { year, occupancy, value };
}
