export const CHALLENGE_STATUSES = ["todo", "active", "won"] as const;
/**
 * Possible statuses of a single Challenge throughout a Winnie.
 */
export type ChallengeStatus = typeof CHALLENGE_STATUSES[number];
// the [number] means "the type of any element" and that's nice

export const MAX_WINNIES_PER_DAY = 10;
export const MAX_CHALLENGES_PER_WINNIE = 50;

// used for use-delayed composable measured in ms
export const ACCEPTED_LOADING_DELAY = 200;
