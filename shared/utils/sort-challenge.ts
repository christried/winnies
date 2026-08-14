import type { ChallengeStatus } from "../constants";

/**
 * Degraded Challenge type with ordering relevant information only.
 */
export interface SortableChallenge {
  pinned: boolean;
  status: ChallengeStatus;
  position: number;
}

// GROUPS:
// 0 = PINNED
// 1 = RUNNING
// 2 = WON

/**
 * Places a challenge into a group.
 * @param challenge The challenge being placed.
 * @returns 0 for pinned, 1 for open, 2 for won.
 */
function groupOf(challenge: SortableChallenge): number {
  if (challenge.pinned)
    return 0;

  return challenge.status === "won" ? 2 : 1;
}

/**
 * Lowers a won challenge to the bottom of its display block. Useful for Pins.
 * @param challenge The challenge being ranked.
 * @returns A group: 1 when the challenge is won, otherwise 0.
 */
function wonRank(challenge: SortableChallenge): number {
  return challenge.status === "won" ? 1 : 0;
}

/**
 * Puts challenges into the correct order while maintaining pins of won Challenges:
 * Pins > Todo > Won
 * @param challenges The challenges to order.
 * @returns A new array holding the same challenges with the correct oder.
 */
export function sortChallenges<T extends SortableChallenge>(challenges: T[]): T[] {
  const challengesCopy = [...challenges];

  return challengesCopy.sort((firstChallenge, secondChallenge) => {
    // Compares by Group (0, 1 or 2)
    const groupDifference = groupOf(firstChallenge) - groupOf(secondChallenge);

    if (groupDifference !== 0)
      return groupDifference;

    // If in same group, compares if it is won (0 or 1)
    const wonRankDifference = wonRank(firstChallenge) - wonRank(secondChallenge);

    if (wonRankDifference !== 0)
      return wonRankDifference;

    return firstChallenge.position - secondChallenge.position;
  });
}
