import type { InsertWinnie } from "../schema";
import { desc, eq } from "drizzle-orm";
import { db } from "..";
import { challenge, winnie } from "../schema";

/**
 * Lists every Winnie owned by a specific user.
 * @param ownerId Signed in user.
 * @returns All fitting Winnie rows.
 */
export function findWinniesByOwner(ownerId: string) {
  return db.query.winnie.findMany({
    where: eq(winnie.ownerId, ownerId),
    orderBy: [desc(winnie.createdAt)],
  });
}

/**
 * Looks for one Winnie with its related Challenges.
 * @param winnieId The Winnie in question.
 * @returns The Winnie and its challenges or undefined if none exists with the param ID.
 */
export function findWinnieWithChallenges(winnieId: string) {
  return db.query.winnie.findFirst({
    where: eq(winnie.id, winnieId),
    with: {
      challenges: { orderBy: [challenge.position] },
    },
  });
}

/**
 * Creates a Winnie in the DB.
 * @param inputValues Validated information necessary for the new Winnie + owner inferred from the session.
 * @returns The created row including all of the db-generated data such as the ID.
 */
export async function createWinnie(
  inputValues: InsertWinnie & { ownerId: string },
) {
  const [newWinnie] = await db.insert(winnie).values(inputValues).returning();

  return newWinnie;
}

/**
 * Renames a Winnie in the DB.
 * @param winnieId The Winnie being renamed.
 * @param name The validated new name.
 * @returns The updated row as a whole including all of the db-generated data even though that did not change or undefined.
 */
export async function renameWinnie(winnieId: string, name: string) {
  const [renamedWinnie] = await db
    .update(winnie)
    .set({ name })
    .where(eq(winnie.id, winnieId))
    .returning();

  return renamedWinnie;
}

/**
 * Deletes a Winnie; its challenges follow through the cascade set in schema configuration.
 * @param winnieId The Winnie being deleted.
 * @returns The deleted row, or undefined when no row matched.
 */
export async function deleteWinnie(winnieId: string) {
  const [deletedWinnie] = await db
    .delete(winnie)
    .where(eq(winnie.id, winnieId))
    .returning({ id: winnie.id });

  return deletedWinnie;
}

/**
 * Reads a Winnie by share slug (Public Route)
 * @param shareSlug The slug taken from the share link.
 * @returns Only data that is supposed to be publicly accessible
 */
export function findWinnieBySlug(shareSlug: string) {
  return db.query.winnie.findFirst({
    where: eq(winnie.shareSlug, shareSlug),
    // Allow list for columns
    columns: {
      id: true,
      name: true,
      totalAccumulatedSeconds: true,
      totalRunningSince: true,
      createdAt: true,
    },
    with: {
      challenges: {
        orderBy: [challenge.position],
        columns: {
          id: true,
          game: true,
          spec: true,
          status: true,
          pinned: true,
          position: true,
          target: true,
          count: true,
          accumulatedSeconds: true,
          runningSince: true,
        },
      },
    },
  });
}
