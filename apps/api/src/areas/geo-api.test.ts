import { describe, expect, it } from "vitest";
import recorded from "./__fixtures__/geo-api-commune.json" with { type: "json" };
import {
  AreaLookupUnavailableError,
  AreaNotFoundError,
  fetchCommune,
  toCommune,
} from "./geo-api.js";

describe("toCommune", () => {
  it("maps a recorded response", () => {
    // The boundary is hundreds of coordinate pairs; its shape is asserted below
    // rather than transcribed here.
    const { boundary, ...facts } = toCommune(recorded);

    expect(boundary?.type).toBe("Polygon");
    expect(facts).toEqual({
      code: "11132",
      name: "Fabrezan",
      postcodes: ["11200"],
      population: 1306,
      areaSqKm: 28.87,
      densityPerSqKm: 45.2,
      department: { code: "11", name: "Aude" },
      region: { code: "76", name: "Occitanie" },
      intercommunality: {
        code: "200035863",
        name: "CC Région Lézignanaise, Corbières et Minervois",
      },
      centre: { latitude: 43.1282, longitude: 2.7139 },
    });
  });

  it("reads GeoJSON coordinates as [longitude, latitude]", () => {
    // Reversing these puts an Aude commune in the Indian Ocean.
    const { centre } = toCommune(recorded);

    expect(centre.latitude).toBeGreaterThan(40);
    expect(centre.longitude).toBeLessThan(10);
  });

  it("converts the published hectares to square kilometres", () => {
    expect(toCommune(recorded).areaSqKm).toBe(28.87);
  });

  it("leaves a missing population missing rather than calling it zero", () => {
    const area = toCommune({ ...recorded, population: undefined });

    expect(area.population).toBeNull();
    // And no density, rather than a density of nobody.
    expect(area.densityPerSqKm).toBeNull();
  });

  it("gives no density when the surface is unknown", () => {
    const area = toCommune({ ...recorded, surface: undefined });

    expect(area.areaSqKm).toBeNull();
    expect(area.densityPerSqKm).toBeNull();
  });

  it("keeps the intercommunality, which carries the only sourced local context", () => {
    // "Corbières et Minervois" names two appellations. It is the source's own
    // wording, not a description HomeGround wrote.
    expect(toCommune(recorded).intercommunality?.name).toContain("Minervois");
  });

  it("has no intercommunality rather than an empty one when the source omits it", () => {
    expect(toCommune({ ...recorded, epci: undefined }).intercommunality).toBeNull();
  });

  it("drops a boundary it cannot read rather than drawing half a commune", () => {
    // An outline missing part of its edge is a false statement about where the
    // commune is. No boundary is honest; a partial one is not.
    const ragged = { ...recorded, contour: { type: "Polygon", coordinates: [[[2.7, 43.1], "x"]] } };

    expect(toCommune(ragged).boundary).toBeNull();
    expect(toCommune({ ...recorded, contour: undefined }).boundary).toBeNull();
    expect(
      toCommune({ ...recorded, contour: { type: "Point", coordinates: [2.7, 43.1] } }).boundary,
    ).toBeNull();
    // The facts survive a boundary that does not.
    expect(toCommune(ragged).name).toBe("Fabrezan");
  });

  it("keeps a multi-part commune whole", () => {
    const islands = {
      ...recorded,
      contour: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [2.7, 43.1],
              [2.8, 43.1],
              [2.8, 43.2],
              [2.7, 43.1],
            ],
          ],
          [
            [
              [3.0, 43.3],
              [3.1, 43.3],
              [3.1, 43.4],
              [3.0, 43.3],
            ],
          ],
        ],
      },
    };

    const boundary = toCommune(islands).boundary;

    expect(boundary?.type).toBe("MultiPolygon");
    expect(boundary?.coordinates).toHaveLength(2);
  });

  it("refuses a response it cannot read rather than inventing a commune", () => {
    expect(() => toCommune({ nom: "Fabrezan" })).toThrow(AreaLookupUnavailableError);
    expect(() => toCommune(null)).toThrow(AreaLookupUnavailableError);
  });

  it("refuses a commune with no usable centre", () => {
    expect(() => toCommune({ ...recorded, centre: { coordinates: ["x", "y"] } })).toThrow(
      AreaLookupUnavailableError,
    );
  });
});

describe("fetchCommune", () => {
  it("distinguishes no such commune from an unanswerable lookup", async () => {
    const notFound = async () => new Response("", { status: 404 });
    const brokenService = async () => new Response("", { status: 503 });

    await expect(fetchCommune("99999", notFound)).rejects.toThrow(AreaNotFoundError);
    await expect(fetchCommune("11132", brokenService)).rejects.toThrow(AreaLookupUnavailableError);
  });

  it("treats a network failure as unavailable, never as not found", async () => {
    const offline = async () => {
      throw new Error("ECONNREFUSED");
    };

    await expect(fetchCommune("11132", offline)).rejects.toThrow(AreaLookupUnavailableError);
  });
});
