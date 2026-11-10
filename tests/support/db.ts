import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../../server/db/schema";
import { readTestEnv } from "./env";
import { applyNeonLocalConfig } from "./neon-local.mjs";

// The repository's copy of the driver, configured the same way the server's traced copy is.
applyNeonLocalConfig(neonConfig);

/**
 * A Neon pool and a Drizzle instance over the test database, with the app's own Drizzle settings
 * (`casing` decides the column names Better Auth's adapter writes). Test code only: the app has its
 * own in server/db.
 *
 * @param connectionTimeoutMillis how long a connection attempt may take before it fails
 * @returns the pool, so the caller can end it, and the Drizzle instance
 */
export function createTestDb(connectionTimeoutMillis = 5_000) {
  const pool = new Pool({ connectionString: readTestEnv().TEST_DATABASE_URL, connectionTimeoutMillis });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { pool, db };
}
