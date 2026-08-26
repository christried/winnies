import { and, eq } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

/**
 * Answers whether a Winnie belongs to a given user.
 * @param winnieId The Winnie the request wants to touch.
 * @param ownerId The signed-in user.
 * @returns True when the Winnie exists and that user owns it.
 */
export async function winnieBelongsTo(winnieId: string, ownerId: string) {
  const [row] = await db
    .select({ id: winnie.id })
    .from(winnie)
    .where(and(eq(winnie.id, winnieId), eq(winnie.ownerId, ownerId)))
    .limit(1);

  return Boolean(row);
}

/**
 * Answers whether a challenge belongs to a specific user, by joining to its Winnie.
 * @param challengeId The challenge the request wants to see.
 * @param ownerId The signed-in user.
 * @returns True when the challenge exists and that user owns it.
 */
export async function challengeBelongsTo(challengeId: string, ownerId: string) {
  const [row] = await db
    .select({ id: challenge.id })
    .from(challenge)
    .innerJoin(winnie, eq(challenge.winnieId, winnie.id))
    .where(and(eq(challenge.id, challengeId), eq(winnie.ownerId, ownerId)))
    .limit(1);

  return Boolean(row);
}
