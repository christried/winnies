import type { DurationName, EaseName, MotionEnv, Tokens } from "./types";
import { browserEnv } from "./env";

/** The `--dur-*` defaults in milliseconds, mirrored 1:1 from `winnies-tokens.css` (the reference's `D`). */
export const DURATIONS: Readonly<Record<DurationName, number>> = Object.freeze({
  "instant": 90,
  "fast": 160,
  "base": 240,
  "hover": 300,
  "toast": 360,
  "flick": 380,
  "modal": 420,
  "page-x": 460,
  "tick": 480,
  "travel": 560,
  "theme": 560,
  "land": 600,
  "jelly": 700,
  "minute": 720,
  "stamp": 900,
  "droop": 950,
  "burst": 1300,
  "hour": 1400,
  "cheer": 1800,
  "breathe": 2200,
  "celebrate": 2400,
  "wave": 2600,
  "highlight": 3000,
  "float": 4800,
  "shimmer": 9000,
  "page": 10000,
  "drift": 60000,
});

/** The easing defaults, used until the tokens are read and wherever a token is missing (the reference's `E`). */
export const EASINGS: Readonly<Record<EaseName, string>> = Object.freeze({
  "spring": "cubic-bezier(.3,1.7,.5,1)",
  "hover": "cubic-bezier(.3,1.8,.5,1)",
  "out": "cubic-bezier(.15,.7,.3,1)",
  "in": "cubic-bezier(.55,0,.75,.2)",
  "in-out": "cubic-bezier(.45,0,.55,1)",
  "standard": "cubic-bezier(.2,0,0,1)",
  "stepped": "steps(6,end)",
  "snappy": "linear(0, .2 4%, .6 10%, .88 16%, 1.02 22%, 1.06 28%, 1.04 36%, 1 46%, .995 60%, 1)",
  "bouncy": "linear(0, .3 6%, .8 13%, 1.1 20%, 1.15 25%, 1.1 30%, .97 40%, .95 46%, 1 56%, 1.02 64%, 1 78%, 1)",
  "soft": "linear(0, .12 5%, .4 14%, .7 24%, .92 34%, 1.02 44%, 1.03 52%, 1.01 66%, 1)",
});

const DURATION_NAMES = Object.keys(DURATIONS) as DurationName[];
const PLAIN_EASES = [
  "spring",
  "hover",
  "out",
  "in",
  "in-out",
  "standard",
  "stepped",
] as const;
const SPRING_EASES = ["snappy", "bouncy", "soft"] as const;

/**
 * The tokens as the engine holds them before the first `refresh()`: the handoff's defaults, Workspace knobs, the
 * Ambient tier running.
 *
 * @returns a fresh copy that the caller may edit
 */
export function defaultTokens(): Tokens {
  return {
    D: { ...DURATIONS },
    E: { ...EASINGS },
    C: {
      gain: 1,
      hop: -6,
      squash: 0.04,
      rate: 1,
      particles: 24,
      ambientPaused: false,
    },
  };
}

/**
 * Reads every `--dur-*`, `--ease-*` and `--spring-*` token, the five knobs and `--ambient-motion` from an element's
 * computed style. A token that is missing keeps its default. The springs are `linear()` curves: where the browser
 * does not parse `linear()`, or the token is empty, each falls back to the `--ease-spring` value just read.
 *
 * @param el the element whose cascade is read; at or inside `<body>`, so dialect knobs are seen
 * @param env where computed style and `linear()` support come from; the browser's by default
 * @returns the tokens, each missing one at its default
 */
export function readTokens(el: Element, env: Pick<MotionEnv, "computedStyle" | "supportsLinear"> = browserEnv()): Tokens {
  const cs = env.computedStyle(el);
  const t = defaultTokens();
  for (const k of DURATION_NAMES) {
    const v = cs.getPropertyValue(`--dur-${k}`).trim();
    if (v) {
      t.D[k] = Number.parseFloat(v) * (v.endsWith("ms")
        ? 1
        : 1000);
    }
  }
  for (const k of PLAIN_EASES) {
    const v = cs.getPropertyValue(`--ease-${k}`).trim();
    if (v)
      t.E[k] = v;
  }
  const hasLinear = env.supportsLinear();
  for (const k of SPRING_EASES) {
    const v = cs.getPropertyValue(`--spring-${k}`).trim();
    t.E[k] = hasLinear && v
      ? v
      : t.E.spring;
  }
  const n = (name: string, d: number) => {
    const v = Number.parseFloat(cs.getPropertyValue(name));
    return Number.isNaN(v)
      ? d
      : v;
  };
  t.C = {
    gain: n("--motion-gain", 1),
    hop: n("--tick-hop", -6),
    squash: n("--tick-squash", 0.04),
    rate: n("--amb-rate", 1),
    particles: Math.round(n("--particle-count", 24)),
    ambientPaused: cs.getPropertyValue("--ambient-motion").trim() === "paused",
  };
  return t;
}
