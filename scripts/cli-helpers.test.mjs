import { describe, expect, it } from "vitest";
import { firstLine, flagError, ghErrorLine, git } from "./cli-helpers.mjs";

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

describe("scripts/cli-helpers.mjs ghErrorLine", () => {
  // The shapes come from reading how `gh api` fails, not from a capture of a real 502: on a JSON error it writes
  // `gh: <message> (HTTP <nnn>)` to stderr; on an answer that is not JSON it writes the body, the page, to stdout and
  // `gh: HTTP 502` to stderr. The second case puts the page in stderr too, the worst shape of it.
  const page = `<!DOCTYPE html>\n<html><head><title>Unicorn!</title></head><body>${"x".repeat(5000)}</body></html>\ngh: HTTP 502\n`;
  const cases = [
    [
      { stderr: "gh: Bad Gateway (HTTP 502)\n" },
      "Bad Gateway (HTTP 502)",
    ],
    [
      { stderr: page },
      "GitHub answered with an error page (HTTP 502)",
    ],
    [
      { stderr: "<html><body>Bad gateway</body></html>" },
      "GitHub answered with an error page",
    ],
    [
      new SyntaxError("Unexpected end of JSON input"),
      "GitHub's answer was cut off or is not JSON",
    ],
    [
      { stderr: "gh: Not Found (HTTP 404)\nextra" },
      "Not Found (HTTP 404)",
    ],
    [
      { message: "spawn gh ENOENT" },
      "spawn gh ENOENT",
    ],
    // The page only in stdout, as `gh api` writes it: nothing of it is ever read.
    [
      { stderr: "gh: HTTP 502\n", stdout: page },
      "HTTP 502",
    ],
    [
      { stderr: "", message: "Command failed: gh api x" },
      "Command failed: gh api x",
    ],
    [
      { stderr: "gh:   two   words\t here  " },
      "two words here",
    ],
  ];

  it.each(cases.map(([error, expected]) => [expected, error]))("turns the error behind `%s` into that one line", (expected, error) => {
    expect(ghErrorLine(error)).toBe(expected);
  });

  it("cuts a long line to 160 characters ending in an ellipsis", () => {
    const line = ghErrorLine({
      stderr: "a".repeat(400),
    });
    expect(line).toHaveLength(160);
    expect(line.endsWith("…")).toBe(true);
  });

  it("never returns a newline or a tag", () => {
    for (const [error] of cases)
      expect(ghErrorLine(error)).not.toMatch(/[\n<]/);
    expect(ghErrorLine({
      stderr: "a".repeat(400),
    })).not.toMatch(/[\n<]/);
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
