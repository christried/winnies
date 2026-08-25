import { and, eq } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

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
