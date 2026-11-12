import type { ThemePreference } from "~~/shared/constants";
import { eq } from "drizzle-orm";
import { db } from "..";
import { user } from "../schema";

/**
 * Stores a user's theme preference.
 * @param userId The signed in user.
 * @param theme The user's preference for theme mode.
 * @returns The successfully stored preference.
 */
export async function updateUserTheme(userId: string, theme: ThemePreference) {
  const [updatedThemePreference] = await db
    .update(user)
    .set({ theme })
    .where(eq(user.id, userId))
    .returning({ theme: user.theme });

  // The account was deleted while its session was still alive
  if (!updatedThemePreference)
    throw createError({ statusCode: 404, statusMessage: "That account no longer exists." });

  return updatedThemePreference;
}

/**
 * Stores a user's reduce-motion preference.
 * @param userId The signed in user.
 * @param reduceMotion Whether the user wants motion reduced.
 * @returns The successfully stored preference.
 */
export async function updateUserReduceMotion(userId: string, reduceMotion: boolean) {
  const [updatedMotionPreference] = await db
    .update(user)
    .set({ reduceMotion })
    .where(eq(user.id, userId))
    .returning({ reduceMotion: user.reduceMotion });

  // The account was deleted while its session was still alive
  if (!updatedMotionPreference)
    throw createError({ statusCode: 404, statusMessage: "That account no longer exists." });

  return updatedMotionPreference;
}
