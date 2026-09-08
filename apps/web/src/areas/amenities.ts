import type { Facility } from "../api/types.js";

/**
 * The categories HomeGround can place on a map today.
 *
 * Deliberately flat. The design tiered these into "essential" and "also
 * nearby", which is a judgment about what matters to a person — and this
 * application does not make those. Every category is a toggle of equal weight
 * and the reader decides what they care about.
 *
 * Groceries, churches and museums arrive with INSEE's equipment census at M3.
 */
export const CATEGORIES = [
  { kind: "hospital" as const, label: "Hospitals", glyph: "H", limit: 5 },
  /**
   * Pharmacies are dense — Montpellier has fifty-one — and a numbered list of
   * fifty-one is a table nobody reads. The nearest five answer the question a
   * reader actually has, and the count beside the list says how many there are
   * in total so the five are not mistaken for all of them.
   */
  { kind: "pharmacy" as const, label: "Pharmacies", glyph: "℞", limit: 5 },
];

export type AmenityKind = (typeof CATEGORIES)[number]["kind"];

export interface Amenity extends Facility {
  /** Position in the visible list, matching its pin. Renumbered on every toggle. */
  number: number;
  /** Straight-line kilometres from the commune's centre. */
  distanceKm: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Straight-line distance, not travel time.
 *
 * A minutes radius needs a routing provider and a point to travel from, and
 * this screen has neither yet. Saying "1.2 km from the centre" is the smaller
 * claim and it is one the coordinates already support.
 */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * The facilities to show, numbered.
 *
 * A facility the source located only to its commune is left out entirely. Its
 * coordinate is the commune's centre wearing a pharmacy's name, so a numbered
 * pin would claim an address it does not have and a numbered row would point
 * at nothing. The Research section still counts it, because it exists — that
 * count comes from the register regardless of how well each one is placed.
 */
export interface AmenityView {
  shown: Amenity[];
  /** How many the source places here in total, per category — including the
   * ones it could not place precisely enough to draw. */
  totals: Record<string, number>;
  /**
   * How many could be drawn at all, across the shown categories.
   *
   * Distinct from the totals: a facility located only to its commune counts
   * towards its category and can never appear on the map, so counting it as
   * "not shown yet" would blame the cap for something the source did.
   */
  placeable: number;
}

export function visibleAmenities(
  facilities: Facility[],
  centre: { latitude: number; longitude: number },
  hidden: ReadonlySet<string>,
): AmenityView {
  const totals: Record<string, number> = {};

  for (const facility of facilities) {
    totals[facility.kind] = (totals[facility.kind] ?? 0) + 1;
  }

  const kept: Amenity[] = [];

  for (const category of CATEGORIES) {
    if (hidden.has(category.kind)) {
      continue;
    }

    kept.push(
      ...facilities
        .filter((facility) => facility.kind === category.kind && facility.precision !== "commune")
        .map((facility) => ({ ...facility, distanceKm: distanceKm(centre, facility), number: 0 }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, category.limit),
    );
  }

  return {
    totals,
    placeable: facilities.filter(
      (facility) => facility.precision !== "commune" && !hidden.has(facility.kind),
    ).length,
    shown: kept
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((facility, index) => ({ ...facility, number: index + 1 })),
  };
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
