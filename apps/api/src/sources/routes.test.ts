import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { getTestDb } from "../test/database.js";
import { REGISTERED_METRICS, SOURCES } from "./registry.js";

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({ db: getTestDb().db });
});

afterEach(async () => {
  await app.close();
});

async function sources() {
  const response = await app.inject({ method: "GET", url: "/api/sources" });

  return JSON.parse(response.body).sources as (typeof SOURCES)[number][];
}

describe("the sources and methodology registry", () => {
  it("lists every source the application uses", async () => {
    expect((await sources()).map((s) => s.id).sort()).toEqual(SOURCES.map((s) => s.id).sort());
  });

  it("gives every source a cadence, a coverage and a limitation", async () => {
    // The panel exists to say what a source cannot tell you. A row without
    // that is an advertisement.
    for (const source of await sources()) {
      expect(source.cadence).not.toBe("");
      expect(source.coverage).not.toBe("");
      expect(source.limitations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("names, for every source, what it is the origin of", async () => {
    // A source claiming nothing is a source with nothing behind it. Most
    // claim metrics; one supplies a photograph, which is not a measurement
    // and must still be declared.
    for (const source of await sources()) {
      expect(source.metrics.length + source.provides.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("claims no metric twice", async () => {
    // Two sources claiming one metric means a figure whose provenance depends
    // on which code path produced it.
    const claimed = (await sources()).flatMap((s) => s.metrics);

    expect(claimed.length).toBe(new Set(claimed).size);
    expect(new Set(claimed)).toEqual(REGISTERED_METRICS);
  });

  it("says where the source can be read", async () => {
    for (const source of await sources()) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.licence).not.toBe("");
    }
  });
});
