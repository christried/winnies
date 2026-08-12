import type { z } from "zod";
import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { winnie } from "./winnie";

export const challengeStatus = pgEnum("challenge_status", ["todo", "active", "won"]);

export const challenge = pgTable("challenge", {
  id: uuid().primaryKey().defaultRandom(),
  winnieId: uuid().notNull().references(() => winnie.id, { onDelete: "cascade" }),

  // UI Data
  game: text().notNull(),
  spec: text().notNull().default(""),
  status: challengeStatus().notNull().default("todo"),
  pinned: boolean().notNull().default(false),
  position: integer().notNull(), // Dodging "order" because it's reserved in SQL

  // Counter Variables
  target: integer().notNull().default(0),
  count: integer().notNull().default(0),

  // Timer
  accumulatedSeconds: integer().notNull().default(0),
  runningSince: timestamp({ withTimezone: true }),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => sql`now()`),

},
// indexing
tableColumns => [
  index().on(tableColumns.winnieId),
]);

export const challengeRelations = relations(challenge, ({ one }) => ({
  winnie: one(winnie, { fields: [challenge.winnieId], references: [winnie.id] }),
}));

export const insertChallengeSchema = createInsertSchema(challenge,
  // this is just refinement of not-omitted columns
  { game: string => string.min(1, "Game is required")
    .max(30, "Game is too long"), spec: string => string.max(40, "Spec is too long").optional(), target: number => number
    .min(0, "Target cannot be negative")
    .optional() })
  .omit({
    id: true,
    winnieId: true,
    status: true,
    pinned: true,
    position: true,
    count: true,
    accumulatedSeconds: true,
    runningSince: true,
    createdAt: true,
    updatedAt: true,
  });

// Schema describing a row coming from the DB
export const selectChallengeSchema = createSelectSchema(challenge);

// The CREATION contract - patch stuff may be different in future implementations
/**
 * Type used when creating a database-compatible Challenge.
 */
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
/**
 * Type used for selecting a Challenge from the database.
 */
export type SelectChallenge = typeof challenge.$inferSelect;
