import { describe, expect, it } from "vitest";
import { firstLine, flagError, git } from "./cli-helpers.mjs";

describe("scripts/cli-helpers.mjs firstLine", () => {
  it("picks git's refusal over the `To <url>` line before it", () => {
    expect(firstLine({ stderr: "To github.com:x/y.git\n ! [remote rejected] b (stale info)\nerror: failed to push\n" })).toBe("! [remote rejected] b (stale info)");
  });

  it("picks an `error:` line over a hint before it", () => {
    expect(firstLine({ stderr: "hint: use -f\nerror: failed to delete 'a': Permission denied\n" })).toBe("error: failed to delete 'a': Permission denied");
  });

  it("falls back to the first line, then to the error's message", () => {
    expect(firstLine({ stderr: "something odd\nmore" })).toBe("something odd");
    expect(firstLine({ message: "spawn failed" })).toBe("spawn failed");
  });
});

describe("scripts/cli-helpers.mjs flagError", () => {
  it("keeps the first sentence of Node's message, drops its hint about `--`, and adds the usage", () => {
    const error = new Error("Unknown option '--dryrun'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- \"--dryrun\"'");
    expect(flagError(error, "usage: x")).toBe("Unknown option '--dryrun'.\nusage: x");
  });
});

describe("scripts/cli-helpers.mjs git", () => {
  it("returns trimmed output, and throws with stderr for a failure", () => {
    expect(git("rev-parse", "--is-inside-work-tree")).toBe("true");
    expect(() => git("rev-parse", "no-such-ref-here")).toThrow();
  });
});
