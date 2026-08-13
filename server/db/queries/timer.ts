import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

/**
 * Query Function called when starting a Winnie timer (the total one).
 * @param winnieId The ID of the Winnie being started/continued.
 * @returns The Update Query for the Winnie Entry of the id in params, where totalRunningSince is being updated.
 */
export function startWinnieTimer(winnieId: string) {
  return db.update(winnie).set({
    // coalesce -> Postgres function to return the first argument that isn't NULL --> makes this IDEMPOTENT
    totalRunningSince: sql`coalesce(${winnie.totalRunningSince}, now())`,
  }).where(eq(winnie.id, winnieId));
}

/**
 * Query Function called when stopping a Winnie timer (the total one).
 * @param winnieId The ID of the Winnie that gets its 1) Total and 2) all Challenge timers stopped in one Go.
 * @returns The **Transaction** Query that combines both the stopping of all challenge timers of the Winnie and the total timer.
 */
export function stopWinnieTimer(winnieId: string) {
  return db.transaction(async (tx) => {
    // stop all challenge timers
    await tx.update(challenge).set({
      accumulatedSeconds:
      sql`${challenge.accumulatedSeconds} + extract(epoch from (now() - ${challenge.runningSince}))::int`,
      runningSince: null,
    }).where(and(
      eq(
        challenge.winnieId,
        winnieId,
      ),
      isNotNull(challenge.runningSince),
    ),
    );

    // stop total timer
    await tx.update(winnie).set(
      {
        totalAccumulatedSeconds:
        sql`${winnie.totalAccumulatedSeconds} + extract(epoch from (now() - ${winnie.totalRunningSince}))::int`,
        totalRunningSince: null,
      },
    ).where(
      and(
        eq(winnie.id, winnieId),
        isNotNull(winnie.totalRunningSince),
      ),
    );
  },

  );
};

/**
 * Query Function called when starting a single Challenge timer.
 * @param challengeId The ID of the challenge being started/continued.
 * @returns The Update Query for the Challenge Entry of the id in params, where runningSince and status are being updated.
 */
export function startChallengeTimer(challengeId: string) {
  return db.update(challenge).set({
    // coalesce -> Postgres function to return the first argument that isn't NULL --> makes this IDEMPOTENT
    runningSince: sql`coalesce(${challenge.runningSince}, now())`,
    status: "active",
  }).where(and(eq(challenge.id, challengeId), ne(challenge.status, "won")));
}

/**
 * Query Function called when stopping a single Challenge timer.
 * @param challengeId The ID of the challenge being stopped.
 * @returns The Update Query for the Challenge Entry of the id in params, where accumulatedSeconds and runningSince are being updated.
 */
export function stopChallengeTimer(challengeId: string) {
  return db.update(challenge).set(
    {
      // now() - runningSice give an interval
      // extract(epoch from ...) makes it a decimal
      accumulatedSeconds: sql`${challenge.accumulatedSeconds} + extract(epoch from (now() - ${challenge.runningSince}))::int`,
      runningSince: null,
    },
  ).where(and(
    eq(
      challenge.id,
      challengeId,
    ),
    isNotNull(challenge.runningSince),
  ),
  );
}
