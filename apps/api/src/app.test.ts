import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { getTestDb } from "./test/database.js";

describe("GET /health", () => {
  it("reports that the service is running", async () => {
    const app = buildApp({ db: getTestDb().db });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
