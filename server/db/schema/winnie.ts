import type { z } from "zod";
import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { user } from "./auth";
import { challenge } from "./challenge";

export const winnie = pgTable("winnie", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),

  ownerId: uuid().notNull().references(() => user.id, { onDelete: "cascade" }),

  shareSlug: uuid().notNull().defaultRandom(),

  // for players feature (out of scope in version 1)
  playersOn: boolean().notNull().default(false),

  // Timer
  totalAccumulatedSeconds: integer().notNull().default(0),
  totalRunningSince: timestamp({ withTimezone: true }),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => sql`now()`),

},
// indexing
tableColumns => [
  index().on(tableColumns.ownerId),
  uniqueIndex().on(tableColumns.shareSlug),
]);

export const winnieRelations = relations(winnie, ({ many }) => ({
  challenges: many(challenge),
}));

export const insertWinnieSchema = createInsertSchema(winnie,
  // this is just refinement of not-omitted columns
  { name: string => string.min(1, "Name is required").max(30, "Name is too long"),
  }).omit({
  id: true,
  ownerId: true,
  shareSlug: true,
  playersOn: true,
  totalAccumulatedSeconds: true,
  totalRunningSince: true,
  createdAt: true,
  updatedAt: true,
});

// Schema describing a row coming from the DB
export const selectWinnieSchema = createSelectSchema(winnie);

// The CREATION contract - patch stuff may be different in future implementations
/**
 * Type used when creating a database-compatible Winnie.
 */
export type InsertWinnie = z.infer<typeof insertWinnieSchema>;
/**
 * Type used for selecting a Winnie from the database.
 */
export type SelectWinnie = typeof winnie.$inferSelect;
