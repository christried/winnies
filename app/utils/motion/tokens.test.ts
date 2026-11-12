import { describe, expect, it } from "vitest";
import { BROADCAST, CALM, fakeElement, fakeEnv, REDUCED, SHOWCASE, WORKSPACE } from "../../../tests/support/fake-motion";
import { defaultTokens, DURATIONS, EASINGS, readTokens } from "./tokens";

// The 27 --dur-* names exactly as winnies-tokens.css spells them, in the file's order.
const DUR_NAMES = [
  "instant",
  "fast",
  "base",
  "hover",
  "toast",
  "flick",
  "modal",
  "page-x",
  "tick",
  "travel",
  "theme",
  "land",
  "jelly",
  "minute",
  "stamp",
  "droop",
  "burst",
  "hour",
  "cheer",
  "breathe",
  "celebrate",
  "wave",
  "highlight",
  "float",
  "shimmer",
  "page",
  "drift",
] as const;

const EASE_NAMES = [
  "spring",
  "hover",
  "out",
  "in",
  "in-out",
  "standard",
  "stepped",
] as const;
const SPRING_NAMES = ["snappy", "bouncy", "soft"] as const;

function read(styles: Record<string, string>, linear = true) {
  return readTokens(fakeElement(), fakeEnv({ styles, linear }));
}

describe("defaults (the handoff's D and E tables)", () => {
  it("holds the 27 durations in milliseconds", () => {
    expect(DURATIONS).toEqual({
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
  });

  it("holds the ten easings", () => {
    expect(EASINGS).toEqual({
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
  });

  it("starts with Workspace knobs and the Ambient tier running", () => {
    expect(defaultTokens().C).toEqual({
      gain: 1,
      hop: -6,
      squash: 0.04,
      rate: 1,
      particles: 24,
      ambientPaused: false,
    });
  });

  it("hands out a copy each time, so a refresh never edits the defaults", () => {
    const t = defaultTokens();
    t.D.tick = 1;
    expect(defaultTokens().D.tick).toBe(480);
  });
});

describe("readTokens durations", () => {
  it.each(DUR_NAMES.map((name, i) => [name, 111 + i] as const))("reads --dur-%s", (name, ms) => {
    const t = read({ [`--dur-${name}`]: `${ms}ms` });
    expect(t.D[name]).toBe(ms);
  });

  it.each([
    ["0.6s", 600],
    ["500ms", 500],
    [" 1.5s ", 1500],
    ["0ms", 0],
  ])("reads %j as %d ms", (value, ms) => {
    expect(read({ "--dur-tick": value }).D.tick).toBe(ms);
    expect(read({ "--dur-flick": value }).D.flick).toBe(ms);
  });

  it("keeps the default where a token is missing", () => {
    const t = read({ "--dur-tick": "0.6s" });
    expect(t.D.flick).toBe(380);
    expect(t.D.drift).toBe(60000);
  });

  it("reads Broadcast's shorter --dur-burst", () => {
    expect(read(BROADCAST).D.burst).toBe(1000);
  });

  it("reads zero for the 21 durations reduced motion zeroes and leaves the six it does not", () => {
    const t = read(REDUCED);
    const left = [
      "breathe",
      "wave",
      "float",
      "shimmer",
      "page",
      "drift",
    ] as const;
    for (const name of DUR_NAMES.filter(n => !(left as readonly string[]).includes(n)))
      expect(t.D[name]).toBe(0);
    expect(left.map(n => t.D[n])).toEqual([2200, 2600, 4800, 9000, 10000, 60000]);
  });
});

describe("readTokens easings", () => {
  it.each(EASE_NAMES)("reads --ease-%s", (name) => {
    expect(read({ [`--ease-${name}`]: `x-${name}` }).E[name]).toBe(`x-${name}`);
  });

  it.each(SPRING_NAMES)("reads --spring-%s when linear() is supported", (name) => {
    expect(read({ [`--spring-${name}`]: `linear(0, 1) /* ${name} */` }, true).E[name]).toBe(`linear(0, 1) /* ${name} */`);
  });

  it.each(SPRING_NAMES)("falls back to the --ease-spring value read when linear() is unsupported (%s)", (name) => {
    const t = read({ "--ease-spring": "cubic-bezier(0, 0, 1, 1)", [`--spring-${name}`]: "linear(0, 1)" }, false);
    expect(t.E[name]).toBe("cubic-bezier(0, 0, 1, 1)");
  });

  it.each(SPRING_NAMES)("falls back to --ease-spring when --spring-%s is empty", (name) => {
    const t = read({ "--ease-spring": "cubic-bezier(0, 0, 1, 1)" }, true);
    expect(t.E[name]).toBe("cubic-bezier(0, 0, 1, 1)");
  });

  it("falls back to the default spring when neither token exists", () => {
    expect(read({}, false).E.bouncy).toBe("cubic-bezier(.3,1.7,.5,1)");
  });

  it("reads the real token file's values", () => {
    const t = read(WORKSPACE);
    expect(t.E.out).toBe("cubic-bezier(.15, .7, .3, 1)");
    expect(t.E.stepped).toBe("steps(6, end)");
    expect(t.E.soft).toBe("linear(0, .12 5%, .4 14%, .7 24%, .92 34%, 1.02 44%, 1.03 52%, 1.01 66%, 1)");
  });
});

describe("readTokens knobs", () => {
  it("reads the five knobs", () => {
    const t = read({
      "--motion-gain": "1.25",
      "--tick-hop": "-6px",
      "--tick-squash": ".1",
      "--amb-rate": "1.4",
      "--particle-count": "24.4",
    });
    expect(t.C).toEqual({
      gain: 1.25,
      hop: -6,
      squash: 0.1,
      rate: 1.4,
      particles: 24,
      ambientPaused: false,
    });
  });

  it("reads a negative px value as a plain number", () => {
    expect(read({ "--tick-hop": "-10px" }).C.hop).toBe(-10);
  });

  it("rounds the particle count", () => {
    expect(read({ "--particle-count": "24.6" }).C.particles).toBe(25);
  });

  it("keeps the default of every missing knob", () => {
    expect(read({}).C).toEqual({
      gain: 1,
      hop: -6,
      squash: 0.04,
      rate: 1,
      particles: 24,
      ambientPaused: false,
    });
  });

  it("keeps the default of an unparseable knob", () => {
    expect(read({ "--motion-gain": "none" }).C.gain).toBe(1);
  });

  it.each([
    [
      "Workspace",
      WORKSPACE,
      {
        gain: 1,
        hop: -6,
        squash: 0.04,
        rate: 1,
        particles: 24,
      },
    ],
    [
      "Broadcast",
      BROADCAST,
      {
        gain: 1.25,
        hop: -10,
        squash: 0,
        rate: 1,
        particles: 28,
      },
    ],
    [
      "Showcase",
      SHOWCASE,
      {
        gain: 1.6,
        hop: -14,
        squash: 0.1,
        rate: 1.4,
        particles: 48,
      },
    ],
    [
      "Calm",
      CALM,
      {
        gain: 0.6,
        hop: -4,
        squash: 0,
        rate: 0.5,
        particles: 0,
      },
    ],
    [
      "reduced",
      REDUCED,
      {
        gain: 0,
        hop: 0,
        squash: 0,
        rate: 1,
        particles: 0,
      },
    ],
  ])("reads the %s knobs from the token file's values", (_name, styles, knobs) => {
    expect(read(styles).C).toMatchObject(knobs);
  });
});

describe("readTokens --ambient-motion", () => {
  it.each([
    ["paused", true],
    [" paused ", true],
    ["running", false],
    ["", false],
  ])("%j gives ambientPaused %s", (value, paused) => {
    expect(read({ "--ambient-motion": value }).C.ambientPaused).toBe(paused);
  });

  it("is paused under reduced motion and running in the Workspace", () => {
    expect(read(REDUCED).C.ambientPaused).toBe(true);
    expect(read(WORKSPACE).C.ambientPaused).toBe(false);
  });
});
