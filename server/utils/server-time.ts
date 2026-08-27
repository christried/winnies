import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Reads the current time from Postgres, the clock that stamped runningSince too and is the SSOT.
 * @returns The database's now() used by composable useServerClock
 */
export async function serverTimestamp(): Promise<Date> {
  const result = await db.execute<{ now: Date }>(sql`select now()`);
  const [row] = result.rows;

  if (!row)
    throw createError({ statusCode: 500, statusMessage: "Could not read server time" });

  return row.now;
}
