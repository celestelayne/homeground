/**
 * Reads what a listing URL already tells us, without fetching anything.
 *
 * The URL is a string the user pasted; parsing it is not reading their site.
 * specs/property.md puts listing scraping out of scope, and nothing here
 * touches the network — the commune is only ever a suggestion, validated
 * against the geocoder before it is used.
 *
 * Agency URLs usually carry the location for search engines. Portals that use
 * numeric ids carry nothing, and that is a normal outcome: the user types it.
 */

/** Metropolitan French postcodes: 01000–95999. */
const POSTCODE = /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/;

const PROPERTY_WORDS = [
  "maison",
  "villa",
  "mas",
  "appartement",
  "domaine",
  "bergerie",
  "ferme",
  "chateau",
  "grange",
  "moulin",
  "terrain",
];

export interface ListingHints {
  /** A place query to try against the geocoder, never used directly. */
  placeQuery: string | null;
  /** A starting name the user can accept or replace. */
  suggestedName: string | null;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function readListingUrl(raw: string): ListingHints {
  const empty: ListingHints = { placeQuery: null, suggestedName: null };

  let url: URL;

  try {
    url = new URL(raw.trim());
  } catch {
    return empty;
  }

  const path = decodeURIComponent(url.pathname).toLowerCase();
  const postcode = POSTCODE.exec(path)?.[0] ?? null;

  // Everything after the postcode in the last meaningful segment is the commune.
  const segment = path.split("/").filter(Boolean).at(-1) ?? "";
  const afterPostcode = postcode ? segment.split(postcode)[1] : undefined;
  const commune = afterPostcode?.replace(/[-_]+/g, " ").trim() || null;

  const propertyWord = PROPERTY_WORDS.find((word) => segment.includes(word)) ?? null;

  return {
    placeQuery: postcode && commune ? `${postcode} ${commune}` : postcode,
    suggestedName:
      propertyWord && commune ? `${titleCase(propertyWord)}, ${titleCase(commune)}` : null,
  };
}
