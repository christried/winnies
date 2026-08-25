import { z } from "zod";
import { CHALLENGE_STATUSES } from "#shared/constants";
import { insertChallengeSchema } from "../db/schema";

// Additional zod schemas that validate BEFORE hitting the DB:
// These exist independently from the DB and the row schemas created there :)
// These can be passed to Nitro's Methods and allow parsing e.g. route data or user input in endpoints

export const idParamSchema = z.object({
  id: z.uuid("Not a valid id"),
});

export const slugParamSchema = z.object({
  slug: z.uuid("Not a valid share link"),
});

export const timerActionSchema = z.object({
  action: z.enum(["start", "stop"]),
});

export const updateChallengeSchema = insertChallengeSchema
  // Changing the target re-clamps count and re-derives status, so it is a
  // counter operation with its own query, not part of an edit.
  .omit({ target: true })
  .extend({
    pinned: z.boolean(),
    status: z.enum(CHALLENGE_STATUSES),
  })
  .partial()
  // Without this an empty body validates, and the handler writes nothing
  .refine(values => Object.keys(values).length > 0, "Nothing to update");

export const reorderSchema = z.object({
  ids: z.array(z.uuid("Not a valid id"))
    .min(1, "Nothing to reorder")
    .refine(ids => new Set(ids).size === ids.length, "The same challenge appears twice"),
});

export const counterSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("step"),
    // Matches adjustChallengeCount's 1 | -1: the server decides what a step
    // means, the client only says which way.
    delta: z.literal([1, -1]),
  }),
  z.object({
    op: z.literal("target"),
    target: z.number().int().min(0, "Target cannot be negative"),
  }),
]);
