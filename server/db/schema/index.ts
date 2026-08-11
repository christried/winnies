import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

// THROWAWAY — WT-C02 only
export const probe = pgTable("probe", {
  id: uuid().primaryKey().defaultRandom(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
