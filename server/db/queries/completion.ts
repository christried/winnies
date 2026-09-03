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
        count: sql`case when ${challenge.target} > 0 then ${challenge.target} else ${challenge.count} end`,
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

/**
 * Reopens a won Challenge without restarting its timer.
 * @param challengeId The Challenge being un-won.
 * @returns The updated row, or undefined when no row matched.
 */
export async function unwinChallenge(challengeId: string) {
  const [reopenedChallenge] = await db.update(challenge)
    .set({
      status: sql`(case when ${challenge.accumulatedSeconds} > 0 then 'active' else 'todo' end)::challenge_status`,
      count: sql`case when ${challenge.target} > 0 then greatest(${challenge.target} - 1, 0) else ${challenge.count} end`,
    })
    .where(eq(challenge.id, challengeId))
    .returning();

  return reopenedChallenge;
}

// Drizzle does not export a transaction type, so derive it from db.transaction
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Stops every timer on a Winnie and its challenges.
 * @param tx The open transaction — completion must not be split across two.
 * @param winnieId The Winnie that wants all of its timers stopped at once.
 */
export async function stopEverything(tx: Tx, winnieId: string) {
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
