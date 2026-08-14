/**
 * Type of the current State of the per-challenge Counter.
 */
export interface CounterStatus {
  count: number;
  target: number;
}

type CounterDelta = 1 | -1;

/**
 * Answer to the question if the single Challenge is won by hitting the target on the Counter (e.g. 3/3).
 * @param currentCounter Information about the current count and also the currently set target of the counter.
 * @returns Either true or false depending on if the target on the counter is met by the count.
 */
export function isWonByCounter(currentCounter: CounterStatus): boolean {
  if (currentCounter.target === 0)
    return false;

  return currentCounter.count >= currentCounter.target;
}

/**
 * Calculates the next count to be shown on the individual shown challenge counter when increments or decrements are called.
 * @param currentCounter Information about the current count and also the currently set target of the counter.
 * @param delta Either 1 or -1 depending on emitted increment or decrement.
 * @returns The new **count** of the counter that called this.
 */
export function nextCount(currentCounter: CounterStatus, delta: CounterDelta): number {
  // Count cannot be incremented in this case
  if (currentCounter.target === 0)
    return currentCounter.count;

  // Count cannot be decremented in this case
  if (currentCounter.count === 0 && delta === -1)
    return currentCounter.count;

  // Count is above target or would be above target and stays as is
  if ((currentCounter.count + delta) > currentCounter.target)
    return currentCounter.target;

  return currentCounter.count + delta;
};
