import { afterAll, beforeEach } from "vitest";
import { properties } from "../db/schema.js";
import { getTestDb } from "./database.js";

beforeEach(async () => {
  await getTestDb().db.delete(properties);
});

afterAll(async () => {
  await getTestDb().pool.end();
});
