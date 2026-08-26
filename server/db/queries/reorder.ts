import { eq } from "drizzle-orm";
import { db } from "..";
import { challenge } from "../schema";

/**
 * Rewrites every position in a Winnie so the given order becomes the stored one.
 * @param winnieId The Winnie whose challenges are being reordered.
 * @param ids Every challenge id in the Winnie, in the order to store.
 * @returns Only a Promise that throws when the ids do not match the Winnie exactly.
 */
export function reorderChallenges(winnieId: string, ids: string[]) {
  return db.transaction(async (tx) => {
    const existindIds = await tx.select({ id: challenge.id })
      .from(challenge)
      .where(eq(challenge.winnieId, winnieId));

    const isSameSetOfIds = existindIds.length === ids.length
      && existindIds.every(row => ids.includes(row.id));

    if (!isSameSetOfIds)
      throw createError({ statusCode: 422, statusMessage: "Order must list every challenge exactly once" });

    for (const [index, id] of ids.entries()) {
      await tx.update(challenge)
        .set({ position: index })
        .where(eq(challenge.id, id));
    }
  });
}
