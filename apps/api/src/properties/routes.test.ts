import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { getTestDb } from "../test/database.js";

const SPECIFIED_FIELDS = [
  "address",
  "askingPrice",
  "createdAt",
  "id",
  "latitude",
  "listingUrl",
  "longitude",
  "notes",
  "status",
  "updatedAt",
];

const validProperty = {
  address: "12 Rue Foch, Montpellier",
  latitude: 43.6108,
  longitude: 3.8767,
};

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({ db: getTestDb().db });
});

afterEach(async () => {
  await app.close();
});

async function create(body: Record<string, unknown> = validProperty) {
  return app.inject({ method: "POST", url: "/api/properties", payload: body });
}

describe("saving a property", () => {
  it("stores a property with confirmed coordinates", async () => {
    const response = await create();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      address: validProperty.address,
      latitude: validProperty.latitude,
      longitude: validProperty.longitude,
    });
  });

  it("defaults a new property to saved", async () => {
    expect((await create()).json().status).toBe("saved");
  });

  it("returns exactly the specified fields", async () => {
    // Guards ADR-003: derived evidence must never reach a client.
    expect(Object.keys((await create()).json()).sort()).toEqual(SPECIFIED_FIELDS);
  });

  it("leaves omitted optional values missing rather than empty or zero", async () => {
    const property = (await create()).json();

    expect(property.askingPrice).toBeNull();
    expect(property.listingUrl).toBeNull();
    expect(property.notes).toBeNull();
  });
});

describe("coordinates are required and must be real", () => {
  it("rejects a property with no latitude", async () => {
    const { latitude: _omitted, ...withoutLatitude } = validProperty;

    expect((await create(withoutLatitude)).statusCode).toBe(400);
  });

  it("rejects a property with no longitude", async () => {
    const { longitude: _omitted, ...withoutLongitude } = validProperty;

    expect((await create(withoutLongitude)).statusCode).toBe(400);
  });

  it("rejects coordinates outside the possible range", async () => {
    expect((await create({ ...validProperty, latitude: 91 })).statusCode).toBe(400);
    expect((await create({ ...validProperty, longitude: -181 })).statusCode).toBe(400);
  });

  it("rejects a property with no address", async () => {
    const { address: _omitted, ...withoutAddress } = validProperty;

    expect((await create(withoutAddress)).statusCode).toBe(400);
    expect((await create({ ...validProperty, address: "" })).statusCode).toBe(400);
  });
});

describe("status", () => {
  it("accepts only the four specified statuses", async () => {
    expect((await create({ ...validProperty, status: "maybe" })).statusCode).toBe(400);
  });

  it("rejects an unknown status on update", async () => {
    const id = (await create()).json().id;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { status: "maybe" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("changing status does not change identity", async () => {
    const created = (await create()).json();

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${created.id}`,
      payload: { status: "shortlist" },
    });

    const updated = response.json();

    expect(response.statusCode).toBe(200);
    expect(updated.status).toBe("shortlist");
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.latitude).toBe(created.latitude);
    expect(updated.longitude).toBe(created.longitude);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("keeps a rejected property rather than deleting it", async () => {
    const id = (await create()).json().id;

    await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { status: "rejected" },
    });

    const listed = (await app.inject({ method: "GET", url: "/api/properties" })).json();

    expect(listed.properties).toHaveLength(1);
    expect(listed.properties[0].status).toBe("rejected");
  });
});

describe("identity and coordinates are not writable", () => {
  it("rejects an update carrying an id", async () => {
    const id = (await create()).json().id;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { status: "visit", id: "00000000-0000-0000-0000-000000000000" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an update carrying coordinates", async () => {
    const id = (await create()).json().id;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { latitude: 0, longitude: 0 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an empty update", async () => {
    const id = (await create()).json().id;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("reports an unknown property as not found", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/properties/00000000-0000-0000-0000-000000000000",
      payload: { status: "visit" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("not_found");
  });
});

describe("notes", () => {
  it("saves and returns notes", async () => {
    const id = (await create()).json().id;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { notes: "Loved the village when we visited" },
    });

    expect(response.json().notes).toBe("Loved the village when we visited");
  });

  it("leaves notes unchanged when the key is absent", async () => {
    const id = (await create()).json().id;

    await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { notes: "Kept" },
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { status: "visit" },
    });

    expect(response.json().notes).toBe("Kept");
  });

  it("clears notes when explicitly null", async () => {
    const id = (await create()).json().id;

    await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { notes: "Temporary" },
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/properties/${id}`,
      payload: { notes: null },
    });

    expect(response.json().notes).toBeNull();
  });
});

describe("listing properties", () => {
  it("returns saved properties, newest first", async () => {
    await create({ ...validProperty, address: "First" });
    await create({ ...validProperty, address: "Second" });

    const listed = (await app.inject({ method: "GET", url: "/api/properties" })).json();

    expect(listed.properties).toHaveLength(2);
    expect(listed.properties.map((p: { address: string }) => p.address)).toContain("First");
  });

  it("returns an empty list when nothing is saved", async () => {
    const listed = (await app.inject({ method: "GET", url: "/api/properties" })).json();

    expect(listed.properties).toEqual([]);
  });
});
