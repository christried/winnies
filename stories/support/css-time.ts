const TIME = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/i;

/**
 * A CSS time as milliseconds. The token file writes `2200ms`, the Storybook build minifies it to `2.2s` (and `240ms`
 * to `.24s`), and `getPropertyValue` returns whichever text the stylesheet holds. Same arithmetic as `readTokens`
 * (`app/utils/motion/tokens.ts`), which reads the engine's tokens the same way.
 *
 * @param value the text of a time, such as `2200ms`, `2.2s` or `.24s`; a bare `0`, which a minifier may leave
 * @returns the time in milliseconds
 * @throws when the text is no time, such as an empty string (a token that is not defined) or `10px`
 */
export function cssTimeMs(value: string): number {
  const text = value.trim();
  if (text === "0") {
    return 0;
  }
  const match = TIME.exec(text);
  if (!match) {
    throw new Error(`Not a CSS time: ${JSON.stringify(value)}`);
  }
  const [, amount = "", unit = ""] = match;
  return Number.parseFloat(amount) * (unit.toLowerCase() === "ms"
    ? 1
    : 1000);
}
