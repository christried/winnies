import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "..";
import { MAX_CHALLENGES_PER_WINNIE, MAX_WINNIES_PER_DAY } from "../../../shared/constants";
import { challenge, winnie } from "../schema";

/**
 * Counts a user's Winnies over a rolling 24 hours, not a calendar day.
 * @param ownerId The signed-in user.
 * @returns How many Winnies that user created in the last day.
 */
export async function countWinniesToday(ownerId: string) {
  const [countedWinnies] = await db
    .select({ count: count() })
    .from(winnie)
    .where(and(
      eq(winnie.ownerId, ownerId),
      // Rolling 24 hours
      gte(winnie.createdAt, sql`now() - interval '1 day'`),
    ));

  return countedWinnies?.count ?? 0;
}

/**
 * Rejects a Winnie creation that would exceed the daily cap.
 * @param ownerId The signed-in user.
 * @returns Nothing; throws a 429 when the cap is reached.
 */
export async function assertWinnieQuota(ownerId: string) {
  if (await countWinniesToday(ownerId) < MAX_WINNIES_PER_DAY)
    return;

  const message = `You can create ${MAX_WINNIES_PER_DAY} Winnies per day. Try again tomorrow.`;

  throw createError({
    statusCode: 429,
    statusMessage: message,
    data: { message },
  });
}

/**
 * Counts how many Challenges a Winnie currently holds.
 * @param winnieId The Winnie a new Challenge would join.
 * @returns The number of Challenges on that Winnie.
 */
export async function countChallenges(winnieId: string) {
  const [countedChallenges] = await db
    .select({ count: count() })
    .from(challenge)
    .where(eq(challenge.winnieId, winnieId));

  return countedChallenges?.count ?? 0;
}

/**
 * Rejects a Challenge creation that would exceed the per-Winnie cap.
 * @param winnieId The Winnie a new Challenge would join.
 * @returns Nothing; throws a 429 when the cap is reached.
 */
export async function assertChallengeQuota(winnieId: string) {
  if (await countChallenges(winnieId) < MAX_CHALLENGES_PER_WINNIE)
    return;

  const message = `A Winnie can hold ${MAX_CHALLENGES_PER_WINNIE} Challenges.`;

  throw createError({
    statusCode: 429,
    statusMessage: message,
    data: { message },
  });
}
