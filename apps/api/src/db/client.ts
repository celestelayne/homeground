import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

/**
 * Built from a connection string rather than read from the environment at
 * import time, so builds and unit tests never require a database.
 */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });

  return { db: drizzle(pool, { schema }), pool };
}

export type Db = ReturnType<typeof createDb>["db"];
