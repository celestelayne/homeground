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
    });
  });

  it("reads GeoJSON coordinates as [longitude, latitude]", () => {
    const [candidate] = toCandidates(recorded);

    // Reversing these puts a Montpellier address off the coast of Somalia.
    expect(candidate?.latitude).toBeGreaterThan(40);
    expect(candidate?.longitude).toBeLessThan(10);
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
