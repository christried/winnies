import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

/**
 * Wins a single Challenge and, if it was the last one, completes the whole Winnie.
 * @param challengeId The Challenge being won.
 * @returns The won challenge row, or undefined when no row matched.
 */
export function winChallenge(challengeId: string) {
  return db.transaction(async (tx) => {
    const [wonChallenge] = await tx.update(challenge)
      .set({
        status: "won",
        accumulatedSeconds: sql`${challenge.accumulatedSeconds} + coalesce(extract(epoch from (now() - ${challenge.runningSince}))::int, 0)`,
        runningSince: null,
      })
      .where(eq(challenge.id, challengeId))
      .returning();

    if (!wonChallenge)
      return undefined;

    const [countingData] = await tx
      .select({
        total: count(),
        unwon: count(sql`case when ${challenge.status} <> 'won' then 1 end`),
      })
      .from(challenge)
      .where(eq(challenge.winnieId, wonChallenge.winnieId));

    const complete = Boolean(countingData && countingData.total > 0 && countingData.unwon === 0);

    if (complete)
      await stopEverything(tx, wonChallenge.winnieId);

    return wonChallenge;
  });
}

// Drizzle does not export a transaction type, so derive it from db.transaction
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Stops every timer on a Winnie and its challenges.
 * @param tx The open transaction — completion must not be split across two.
 * @param winnieId The Winnie that wants all of its timers stopped at once.
 */
async function stopEverything(tx: Tx, winnieId: string) {
  await tx.update(challenge)
    .set({
      accumulatedSeconds: sql`${challenge.accumulatedSeconds} + extract(epoch from (now() - ${challenge.runningSince}))::int`,
      runningSince: null,
    })
    .where(and(eq(challenge.winnieId, winnieId), isNotNull(challenge.runningSince)));

  await tx.update(winnie)
    .set({
      totalAccumulatedSeconds: sql`${winnie.totalAccumulatedSeconds} + extract(epoch from (now() - ${winnie.totalRunningSince}))::int`,
      totalRunningSince: null,
    })
    .where(and(eq(winnie.id, winnieId), isNotNull(winnie.totalRunningSince)));
}
