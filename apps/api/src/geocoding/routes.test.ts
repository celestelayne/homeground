import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { getTestDb } from "../test/database.js";
import recorded from "./__fixtures__/ign-search.json" with { type: "json" };
import type { FetchLike } from "./ign.js";

let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

function withGeocoder(fetchImpl: FetchLike) {
  app = buildApp({ db: getTestDb().db, fetchImpl });

  return app;
}

const respondWith = (body: unknown, status = 200): FetchLike =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as FetchLike;

describe("GET /api/geocode", () => {
  it("returns candidates for an address the geocoder knows", async () => {
    const response = await withGeocoder(respondWith(recorded)).inject({
      method: "GET",
      url: "/api/geocode?q=12 rue Foch Montpellier",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().candidates[0]).toMatchObject({
      label: "12 Rue Foch 34000 Montpellier",
      latitude: 43.610962,
      longitude: 3.874026,
    });
  });

  it("returns an empty list when the geocoder found no match", async () => {
    const response = await withGeocoder(respondWith({ features: [] })).inject({
      method: "GET",
      url: "/api/geocode?q=nowhere at all",
    });

    // None identified. A real answer.
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ candidates: [] });
  });
});

describe("an unavailable geocoder is not an empty result", () => {
  const unavailable: Array<[string, FetchLike]> = [
    ["the service errors", respondWith({}, 500)],
    [
      "the service is unreachable",
      (async () => {
        throw new Error("ECONNREFUSED");
      }) as unknown as FetchLike,
    ],
    [
      "the body is not JSON",
      (async () =>
        new Response("<html>maintenance</html>", { status: 200 })) as unknown as FetchLike,
    ],
    ["the shape is unrecognisable", respondWith({ unexpected: true })],
  ];

  for (const [description, fetchImpl] of unavailable) {
    it(`reports geocoder_unavailable when ${description}`, async () => {
      const response = await withGeocoder(fetchImpl).inject({
        method: "GET",
        url: "/api/geocode?q=12 rue Foch Montpellier",
      });

      expect(response.statusCode).toBe(502);
      expect(response.json().error.code).toBe("geocoder_unavailable");
      // The distinction docs/methodology.md requires: unable to determine
      // must never arrive looking like nothing was found.
      expect(response.json()).not.toHaveProperty("candidates");
    });
  }
});

describe("the query itself", () => {
  it("rejects a query too short to be an address", async () => {
    const response = await withGeocoder(respondWith(recorded)).inject({
      method: "GET",
      url: "/api/geocode?q=ab",
    });

    expect(response.statusCode).toBe(400);
  });
});
