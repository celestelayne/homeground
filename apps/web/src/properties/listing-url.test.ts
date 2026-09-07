import { describe, expect, it } from "vitest";
import { readListingUrl } from "./listing-url.js";

describe("reading a listing URL", () => {
  it("finds the commune an agency URL carries", () => {
    expect(
      readListingUrl(
        "https://www.gc34immobilier.com/properties/vente-maison-3-pieces-2-chambres-80-00-m2-34310-montouliers/",
      ),
    ).toEqual({
      placeQuery: "34310 montouliers",
      suggestedName: "Maison, Montouliers",
    });
  });

  it("finds nothing in a URL that only carries an id", () => {
    // Leboncoin and SeLoger use numeric ids; the user types the commune.
    expect(readListingUrl("https://www.leboncoin.fr/ventes_immobilieres/2891234567.htm")).toEqual({
      placeQuery: null,
      suggestedName: null,
    });
  });

  it("ignores anything that is not a URL", () => {
    expect(readListingUrl("not a url")).toEqual({ placeQuery: null, suggestedName: null });
    expect(readListingUrl("")).toEqual({ placeQuery: null, suggestedName: null });
  });

  it("does not mistake other five-digit numbers for a postcode", () => {
    // 99999 is outside the metropolitan range.
    expect(readListingUrl("https://example.com/ref-99999-something").placeQuery).toBeNull();
  });
});
