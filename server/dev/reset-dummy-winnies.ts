import { eq } from "drizzle-orm";
import { db } from "../db";
import { challenge, winnie } from "../db/schema";
import { DUMMY_WINNIES } from "./dummy-winnies";

const HOUR_MS = 3_600_000;

// A timer that has run for `seconds` started that long before `now`; null is a stopped timer.
function startedAt(now: number, seconds: number | null): Date | null {
  return seconds === null
    ? null
    : new Date(now - seconds * 1000);
}

/**
 * Replaces one dev Owner's Winnies with the dummy set (#236).
 * The delete is by `ownerId` and nothing else: Challenges go by the cascade, and no other table or Owner is touched.
 * Ids and Share Link slugs are new after every reset.
 * @param ownerId The dev Owner `?as=` named.
 * @param now The reset's moment, in ms; the dummy set's offsets count back from it.
 */
export async function resetDummyWinnies(ownerId: string, now = Date.now()): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(winnie).where(eq(winnie.ownerId, ownerId));

    for (const dummy of DUMMY_WINNIES) {
      const createdAt = new Date(now - dummy.createdHoursAgo * HOUR_MS);
      const [created] = await tx.insert(winnie)
        .values({
          name: dummy.name,
          ownerId,
          totalAccumulatedSeconds: dummy.totalAccumulatedSeconds,
          totalRunningSince: startedAt(now, dummy.runningForSeconds),
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: winnie.id });

      // drizzle rejects an empty `values`
      if (dummy.challenges.length === 0) {
        continue;
      }
      await tx.insert(challenge).values(dummy.challenges.map((c, position) => ({
        winnieId: created!.id,
        game: c.game,
        spec: c.spec,
        status: c.status,
        pinned: c.pinned,
        position,
        target: c.target,
        count: c.count,
        accumulatedSeconds: c.accumulatedSeconds,
        runningSince: startedAt(now, c.runningForSeconds),
        createdAt,
        updatedAt: createdAt,
      })));
    }
  });
}
