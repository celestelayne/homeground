import { describe, expect, it } from "vitest";
import recorded from "./__fixtures__/ign-search.json" with { type: "json" };
import { GeocoderUnavailableError, toCandidates } from "./ign.js";

describe("toCandidates", () => {
  it("maps a recorded IGN response", () => {
    const [candidate] = toCandidates(recorded);

    expect(candidate).toEqual({
      id: "34172_2250_00012",
      label: "12 Rue Foch 34000 Montpellier",
      latitude: 43.610962,
      longitude: 3.874026,
      precision: "exact",
      communeCode: "34172",
    });
  });

  it("keeps the INSEE code, which is what identifies a commune", () => {
    const [candidate] = toCandidates(recorded);

    // Not the postcode: 11200 alone covers five communes, and commune names
    // repeat across France. 34172 is Montpellier and only Montpellier.
    expect(candidate?.communeCode).toBe("34172");
  });

  it("leaves the commune unknown rather than reading one out of the label", () => {
    const noCitycode = {
      features: [
        {
          properties: { label: "12 Rue Foch 34000 Montpellier", type: "housenumber" },
          geometry: { coordinates: [3.874026, 43.610962] },
        },
      ],
    };

    // The label says Montpellier. Guessing 34172 from that would key evidence
    // to a commune the source never confirmed.
    expect(toCandidates(noCitycode)[0]?.communeCode).toBeNull();
  });

  it("reads GeoJSON coordinates as [longitude, latitude]", () => {
    const [candidate] = toCandidates(recorded);

    // Reversing these puts a Montpellier address off the coast of Somalia.
    expect(candidate?.latitude).toBeGreaterThan(40);
    expect(candidate?.longitude).toBeLessThan(10);
  });

  it("reports the best tier each result type can support", () => {
    const feature = (type: string) => ({
      properties: { label: "x", type },
      geometry: { coordinates: [3.87, 43.61] },
    });

    const precisionFor = (type: string) =>
      toCandidates({ features: [feature(type)] })[0]?.precision;

    expect(precisionFor("housenumber")).toBe("exact");
    expect(precisionFor("street")).toBe("zone");
    expect(precisionFor("locality")).toBe("zone");
    expect(precisionFor("municipality")).toBe("commune");
  });

  it("falls to the least precise tier for a type it does not recognise", () => {
    // Never overstate how well a property is located.
    const unknownType = {
      features: [
        {
          properties: { label: "x", type: "something_new" },
          geometry: { coordinates: [3.87, 43.61] },
        },
      ],
    };

    expect(toCandidates(unknownType)[0]?.precision).toBe("commune");
  });

  it("returns an empty list when the geocoder found nothing", () => {
    // "None identified" — a real answer, not a failure.
    expect(toCandidates({ features: [] })).toEqual([]);
  });

  it("drops a feature it cannot read rather than guessing at one", () => {
    const payload = {
      features: [
        { properties: { label: "No geometry" } },
        { geometry: { coordinates: [3, 43] } },
        { properties: { label: "Text coordinates" }, geometry: { coordinates: ["3", "43"] } },
        { properties: { label: "Impossible" }, geometry: { coordinates: [3, 999] } },
        { properties: { label: "Good" }, geometry: { coordinates: [3.87, 43.61] } },
      ],
    };

    expect(toCandidates(payload).map((c) => c.label)).toEqual(["Good"]);
  });

  it("falls back to coordinates when a feature carries no id", () => {
    const payload = {
      features: [{ properties: { label: "No id" }, geometry: { coordinates: [3.87, 43.61] } }],
    };

    expect(toCandidates(payload)[0]?.id).toBe("3.87,43.61");
  });

  it("treats an unrecognisable response as unavailable, not as empty", () => {
    expect(() => toCandidates({ unexpected: true })).toThrow(GeocoderUnavailableError);
    expect(() => toCandidates(null)).toThrow(GeocoderUnavailableError);
  });
});
