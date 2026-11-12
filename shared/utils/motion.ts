/**
 * Reads the reduce-motion cookie. `useCookie` decodes a value with `destr`, so `true` arrives as a boolean
 * and junk as a string; both spellings are accepted so the rule does not depend on that.
 * @param raw The cookie's decoded value.
 * @returns true or false for a boolean or the strings "true" and "false"; undefined for anything else.
 */
export function parseMotionCookie(raw: unknown): boolean | undefined {
  if (raw === true || raw === "true")
    return true;
  if (raw === false || raw === "false")
    return false;
  return undefined;
}

/**
 * Dynamically set the "data-motion" value for the reduce-motion preference.
 * @param reduceMotion Whether motion is reduced.
 * @returns "reduce" when on; undefined (no attribute) when off, so the OS setting alone decides.
 */
export function motionAttribute(reduceMotion: boolean) {
  return reduceMotion ? "reduce" : undefined;
}
