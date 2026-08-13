export const CHALLENGE_STATUSES = ["todo", "active", "won"] as const;
/**
 * Possible statuses of a single Challenge throughout a Winnie.
 */
export type ChallengeStatus = typeof CHALLENGE_STATUSES[number];
// the [number] means "the type of any element" and that's nice
