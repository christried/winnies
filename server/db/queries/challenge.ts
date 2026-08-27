import type { InsertChallenge } from "../schema";
import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { challenge } from "../schema";

/**
 * Appends a Challenge to the end of a Winnie's Challenge list.
 * @param winnieId The Winnie it belongs to.
 * @param inputValues The validated body.
 * @returns The created Challenge-row.
 */
export async function createChallenge(winnieId: string, inputValues: InsertChallenge) {
  const [createdChallenge] = await db.insert(challenge)
    .values(
      { ...inputValues, winnieId, position:
        sql`(select coalesce(max(${challenge.position}), -1) + 1 from ${challenge} where ${challenge.winnieId} = ${winnieId})` },
    )
    .returning();

  return createdChallenge;
}

/**
 * Edits a challenge's descriptive fields only.
 * @param challengeId The challenge being edited.
 * @param inputValues The validated body.
 * @returns The updated row, or undefined when no row matched.
 */
export async function updateChallenge(
  challengeId: string,
  inputValues: Partial<Pick<InsertChallenge, "game" | "spec">> & { pinned?: boolean },
) {
  const [updatedChallenge] = await db.update(challenge)
    .set(inputValues)
    .where(eq(challenge.id, challengeId))
    .returning();

  return updatedChallenge;
}

/**
 * Deletes one Challenge.
 * @param challengeId The Challenge being deleted.
 * @returns The deleted row, or undefined when no row matched.
 */
export async function deleteChallenge(challengeId: string) {
  const [row] = await db.delete(challenge)
    .where(eq(challenge.id, challengeId))
    .returning({ id: challenge.id });

  return row;
}

/**
 * Copies a Challenge, resetting everything to default values for the new Challenge.
 * @param challengeId The Challenge being duplicated.
 * @returns The new Challenge row or undefined.
 */
export function duplicateChallenge(challengeId: string) {
  return db.transaction(async (tx) => {
    const originalChallenge = await tx.query.challenge.findFirst(
      {
        where: eq(challenge.id, challengeId),
      },
    );

    if (!originalChallenge)
      return undefined;

    const [duplicatedChallenge] = await tx.insert(challenge)
      .values(
        {
          winnieId: originalChallenge.winnieId,
          game: originalChallenge.game,
          spec: originalChallenge.spec,
          target: originalChallenge.target,
          // The rest is not duplicated so it is generated to default values
          position: sql`(select coalesce(max(${challenge.position}), -1) + 1 from ${challenge} where ${challenge.winnieId} = ${originalChallenge.winnieId})`,

        },
      )
      .returning();

    return duplicatedChallenge;
  });
}

/**
 * Applies one counter step. SQL Logic is clankered.
 * @param challengeId The challenge whose counter moved.
 * @param delta Either 1 or -1, matching the delta the client emits.
 * @returns The updated row, or undefined when no row matched.
 */
export async function adjustChallengeCount(challengeId: string, delta: 1 | -1) {
  const clamped = sql`least(greatest(${challenge.count} + ${delta}, 0), ${challenge.target})`;
  // target = 0 means there is no counter, so the count is left alone
  const next = sql`case when ${challenge.target} = 0 then ${challenge.count} else ${clamped} end`;

  const [row] = await db.update(challenge)
    .set({
      count: next,
      status: sql`
        case
          when ${challenge.target} > 0 and ${next} >= ${challenge.target} then 'won'
          when ${challenge.status} = 'won' and ${challenge.runningSince} is not null then 'active'
          when ${challenge.status} = 'won' then 'todo'
          else ${challenge.status}
        end
      `,
    })
    .where(eq(challenge.id, challengeId))
    .returning();

  return row;
}

/**
 * Changes a Challenge counter target. Standalone query because this might have implications on other properties of the Challenge.
 * SQL is clankered, really need to revist this stuff.
 * @param challengeId The Challenge being reconfigured.
 * @param target The validated new target; 0 removes the counter entirely.
 * @returns The updated row or undefined.
 */
export async function setChallengeTarget(challengeId: string, target: number) {
  // The new target is the parameter, never challenge.target
  const next = sql`case when ${target}::int = 0 then ${challenge.count} else least(${challenge.count}, ${target}::int) end`;

  const [row] = await db.update(challenge)
    .set({
      target,
      count: next,
      status: sql`
        case
          when ${target}::int > 0 and ${next} >= ${target}::int then 'won'
          when ${challenge.status} = 'won' and ${challenge.runningSince} is not null then 'active'
          when ${challenge.status} = 'won' then 'todo'
          else ${challenge.status}
        end
      `,
    })
    .where(eq(challenge.id, challengeId))
    .returning();

  return row;
}
