import type { ChallengeStatus } from "../constants";

/**
 * Degraded Challenge type with status only.
 */
export interface CompletableChallenge {
  status: ChallengeStatus;
}

/**
 * Function that answers the question if the current Winnie is completed by completing all Challenges with a minimum of one Challenge.
 * @param challenges All Challenges of the current Winnie.
 * @returns A Boolean depending on whether the Winnie is complete or is not.
 * A Winnie is completed if it has Challenges and those Challenges are won.
 */
export function isWinnieComplete(challenges: CompletableChallenge[]): boolean {
  if (challenges.length === 0)
    return false;

  return (challenges.every(challenge => challenge.status === "won"));
}
