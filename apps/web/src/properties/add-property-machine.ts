import type { GeocodeCandidate, LocationTier } from "../api/types.js";

/**
 * Where a property's location has got to.
 *
 * specs/property.md forbids saving from unconfirmed geocoding output, so the
 * rule is expressed as the shape of this value rather than as a check inside a
 * handler: only `confirmed` carries coordinates, so only `confirmed` can be
 * saved.
 */
export type LocationDraft =
  | { kind: "empty" }
  /** Typed, but nothing has been looked up yet. */
  | { kind: "typing"; query: string }
  | { kind: "searching"; query: string }
  | { kind: "candidates"; query: string; candidates: GeocodeCandidate[] }
  | { kind: "no-matches"; query: string }
  /** The geocoder could not answer. Different from finding nothing. */
  | { kind: "lookup-unavailable"; query: string }
  | {
      kind: "confirmed";
      latitude: number;
      longitude: number;
      address: string | null;
      /** What the source of these coordinates can support, at best. */
      suggestedTier: LocationTier;
      source: "geocode" | "map";
    };

export interface AddPropertyDraft {
  listingUrl: string;
  name: string;
  askingPrice: string;
  location: LocationDraft;
  /** Declared by the user. Never inferred — see specs/property.md. */
  tier: LocationTier | null;
  /** True while the user is picking a point on the map. */
  placing: boolean;
}

export const emptyDraft: AddPropertyDraft = {
  listingUrl: "",
  name: "",
  askingPrice: "",
  location: { kind: "empty" },
  tier: null,
  placing: false,
};

export type AddPropertyAction =
  | { type: "listing-url-changed"; value: string; suggestedName: string | null }
  | { type: "name-changed"; value: string }
  | { type: "price-changed"; value: string }
  | { type: "query-changed"; value: string }
  | { type: "search-started"; query: string }
  | { type: "candidates-returned"; query: string; candidates: GeocodeCandidate[] }
  | { type: "lookup-failed"; query: string }
  | { type: "candidate-confirmed"; candidate: GeocodeCandidate }
  | { type: "placing-started" }
  | { type: "placing-cancelled" }
  | { type: "placed-on-map"; latitude: number; longitude: number }
  | { type: "tier-declared"; tier: LocationTier };

/** The query currently in the address field, whatever state it is in. */
export function locationQuery(location: LocationDraft): string {
  switch (location.kind) {
    case "empty":
      return "";
    case "confirmed":
      return location.address ?? "";
    default:
      return location.query;
  }
}

export function reduce(draft: AddPropertyDraft, action: AddPropertyAction): AddPropertyDraft {
  switch (action.type) {
    case "listing-url-changed":
      return {
        ...draft,
        listingUrl: action.value,
        // A suggestion never overwrites something the user has typed.
        name: draft.name === "" && action.suggestedName ? action.suggestedName : draft.name,
      };

    case "name-changed":
      return { ...draft, name: action.value };

    case "price-changed":
      return { ...draft, askingPrice: action.value };

    case "query-changed":
      // Editing the address abandons any confirmed location. Otherwise you
      // could confirm one village, retype another, and save the second name
      // against the first village's coordinates.
      return {
        ...draft,
        location:
          action.value === "" ? { kind: "empty" } : { kind: "searching", query: action.value },
        tier: null,
      };

    case "search-started":
      return { ...draft, location: { kind: "searching", query: action.query } };

    case "candidates-returned":
      return {
        ...draft,
        location:
          action.candidates.length === 0
            ? { kind: "no-matches", query: action.query }
            : { kind: "candidates", query: action.query, candidates: action.candidates },
      };

    case "lookup-failed":
      return { ...draft, location: { kind: "lookup-unavailable", query: action.query } };

    case "candidate-confirmed":
      return {
        ...draft,
        location: {
          kind: "confirmed",
          latitude: action.candidate.latitude,
          longitude: action.candidate.longitude,
          address: action.candidate.label,
          suggestedTier: action.candidate.precision,
          source: "geocode",
        },
        // The geocoder's precision is offered as a starting point. The user
        // still declares the tier.
        tier: action.candidate.precision,
        placing: false,
      };

    case "placing-started":
      return { ...draft, placing: true };

    case "placing-cancelled":
      return { ...draft, placing: false };

    case "placed-on-map":
      return {
        ...draft,
        location: {
          kind: "confirmed",
          latitude: action.latitude,
          longitude: action.longitude,
          address: locationQuery(draft.location) || null,
          // A placed point could be a rooftop or a guess at a hillside. Only
          // the person who placed it knows which, so nothing is suggested.
          suggestedTier: "zone",
          source: "map",
        },
        tier: null,
        placing: false,
      };

    case "tier-declared":
      return { ...draft, tier: action.tier };
  }
}

/**
 * A property can be saved only with a name, a confirmed location, and a
 * declared tier. Every rule in specs/property.md that governs saving is
 * answered here.
 */
export function canSave(draft: AddPropertyDraft): boolean {
  return draft.name.trim() !== "" && draft.location.kind === "confirmed" && draft.tier !== null;
}
