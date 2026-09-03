import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

/**
 * Query Function called when starting a Winnie timer (the total one).
 * @param winnieId The ID of the Winnie being started/continued.
 * @returns The touched Winnie rows — empty when it was already running, complete or empty.
 */
export function startWinnieTimer(winnieId: string) {
  return db.update(winnie).set({
    // coalesce -> Postgres function to return the first argument that isn't NULL --> makes this IDEMPOTENT
    totalRunningSince: sql`coalesce(${winnie.totalRunningSince}, now())`,
  }).where(and(
    eq(winnie.id, winnieId),
    sql`exists (select 1 from ${challenge}
                where ${challenge.winnieId} = ${winnie.id}
                  and ${challenge.status} <> 'won')`,
  )).returning({ id: winnie.id });
}

/**
 * Stops a Winnie's total timer and every running challenge timer under it.
 * @param winnieId The Winnie being paused.
 * @returns The total-timer rows the stop touched.
 */
export function stopWinnieTimer(winnieId: string) {
  return db.transaction(async (tx) => {
    await tx.update(challenge)
      .set({
        accumulatedSeconds: sql`${challenge.accumulatedSeconds} + extract(epoch from (now() - ${challenge.runningSince}))::int`,
        runningSince: null,
      })
      .where(and(eq(challenge.winnieId, winnieId), isNotNull(challenge.runningSince)));

    return tx.update(winnie)
      .set({
        totalAccumulatedSeconds: sql`${winnie.totalAccumulatedSeconds} + extract(epoch from (now() - ${winnie.totalRunningSince}))::int`,
        totalRunningSince: null,
      })
      .where(and(eq(winnie.id, winnieId), isNotNull(winnie.totalRunningSince)))
      .returning({ id: winnie.id });
  });
}

/**
 * Query Function called when starting a single Challenge timer.
 * @param challengeId The ID of the challenge being started/continued.
 * @returns The started Challenge identified by its ID.
 */
export async function startChallengeTimer(challengeId: string) {
  const [startedChallenge] = await db.update(challenge).set({
    // coalesce -> Postgres function to return the first argument that isn't NULL --> makes this IDEMPOTENT
    runningSince: sql`coalesce(${challenge.runningSince}, now())`,
    status: "active",
  }).where(and(eq(challenge.id, challengeId), ne(challenge.status, "won"))).returning({ id: challenge.id });

  return startedChallenge;
}

/**
 * Query Function called when stopping a single Challenge timer.
 * @param challengeId The ID of the challenge being stopped.
 * @returns The stopped Challenge rows — empty when it was already stopped.
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
  )).returning({ id: challenge.id });
}

/**
 * Starts a challenge timer and the Winnie's total timer in case that isn't running yet.
 * @param challengeId The challenge being started.
 * @returns The challenge row the start actually touched
 */
export function startChallengeAndWinnieTimers(challengeId: string) {
  return db.transaction(async (tx) => {
    const [startedChallenge] = await tx.update(challenge)
      .set({ runningSince: sql`coalesce(${challenge.runningSince}, now())`, status: "active" })
      .where(and(eq(challenge.id, challengeId), ne(challenge.status, "won")))
      .returning({ id: challenge.id, winnieId: challenge.winnieId });

    // No startedChallenge means the challenge was already won, so Winnie timer must not start
    if (!startedChallenge)
      return [];

    await tx.update(winnie)
      .set({ totalRunningSince: sql`coalesce(${winnie.totalRunningSince}, now())` })
      .where(eq(winnie.id, startedChallenge.winnieId));

    return [startedChallenge];
  });
}

/**
 * Resets a Challenge timer to 0, stopping it if it was running.
 * @param challengeId The challenge being reset.
 * @returns The updated Challenge row, or undefined when no row matched.
 */
export async function resetChallengeTimer(challengeId: string) {
  const [resetChallenge] = await db.update(challenge)
    .set({ accumulatedSeconds: 0, runningSince: null })
    .where(eq(challenge.id, challengeId))
    .returning();

  return resetChallenge;
}
