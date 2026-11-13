/**
 * The won count the bar draws: a whole number from 0 to the total. A count over the total is full, one under zero is
 * empty, a fraction counts only the Challenges that are done, and a count that is not a number (NaN, Infinity) is
 * empty rather than a guess.
 * @param won the won Challenges
 * @param total all Challenges
 * @returns an integer in `0..max(total, 0)`
 */
export function clampedWon(won: number, total: number): number {
  if (!Number.isFinite(won) || !Number.isFinite(total))
    return 0;
  return Math.min(Math.max(Math.trunc(won), 0), Math.max(Math.trunc(total), 0));
}

/**
 * The share of the bar that is filled, in whole percent. Rounded half up, as the store's percent is, so the bar and
 * the "3 / 8 won · 38 %" label (R3's) agree. No Challenges is 0, not a division by zero.
 * @param won the won Challenges
 * @param total all Challenges
 * @returns an integer from 0 to 100
 */
export function progressPercent(won: number, total: number): number {
  if (!(total > 0))
    return 0;
  return Math.round(clampedWon(won, total) / total * 100);
}
