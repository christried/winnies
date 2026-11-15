import { describe, expect, it } from "vitest";
import { DURATIONS, readTokens } from "../../app/utils/motion/tokens";
import { fakeElement, fakeEnv } from "../../tests/support/fake-motion";
import { cssTimeMs } from "./css-time";

// The token file writes `2200ms`; the Storybook build minifies it to `2.2s`, `.6s` or, for a zero, `0s` or `0`.
// A story that compares an animation's duration with a token must read both spellings as the same milliseconds.
describe("cssTimeMs", () => {
  it.each([
    ["2200ms", 2200],
    ["2.2s", 2200],
    ["0.38s", 380],
    [".6s", 600],
    [".24s", 240],
    ["3s", 3000],
    ["60s", 60000],
    ["900ms", 900],
    ["0ms", 0],
    ["0s", 0],
    ["0", 0],
    [" 2.2s ", 2200],
    ["2.2S", 2200],
  ])("reads %j as %d ms", (text, ms) => {
    expect(cssTimeMs(text)).toBe(ms);
  });

  it.each(["", "fast", "10px", "2.2"])("throws on %j, which is no time", (text) => {
    expect(() => cssTimeMs(text)).toThrow(JSON.stringify(text));
  });

  // The engine reads the same text with its own arithmetic: the two must not drift apart.
  it.each(Object.entries(DURATIONS))("agrees with the engine on --dur-%s (%d ms), written either way", (name, ms) => {
    for (const spelling of [`${ms}ms`, `${ms / 1000}s`]) {
      const engine = readTokens(fakeElement(), fakeEnv({
        styles: { [`--dur-${name}`]: spelling },
      })).D;
      expect(cssTimeMs(spelling)).toBe(ms);
      expect(cssTimeMs(spelling)).toBe(engine[name as keyof typeof engine]);
    }
  });

  it("covers the 27 durations of the token file", () => {
    expect(Object.keys(DURATIONS)).toHaveLength(27);
  });
});
