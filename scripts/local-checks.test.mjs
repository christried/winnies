import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { localChecksNotice } from "./local-checks.mjs";

const SCRIPT = fileURLToPath(new URL("./local-checks.mjs", import.meta.url));
const ONE_TICKET = [
  { number: 12, title: "A ticket" },
];

describe("what a session is told about the tickets waiting for a local check", () => {
  it("prints nothing in a cloud container", () => {
    expect(localChecksNotice({
      env: { CLAUDE_CODE_REMOTE: "true" },
      tickets: ONE_TICKET,
    })).toBe("");
  });

  it("prints nothing for an empty list", () => {
    expect(localChecksNotice({ env: {}, tickets: [] })).toBe("");
  });

  it("prints nothing for a read that failed", () => {
    expect(localChecksNotice({ env: {}, tickets: null })).toBe("");
  });

  it("does not take an empty CLAUDE_CODE_REMOTE for a container", () => {
    expect(localChecksNotice({
      env: { CLAUDE_CODE_REMOTE: "" },
      tickets: ONE_TICKET,
    })).toContain("#12 A ticket");
  });

  it("lists each ticket, in order, and names the label", () => {
    const notice = localChecksNotice({
      env: {},
      tickets: [
        { number: 12, title: "First" },
        { number: 13, title: "Second" },
      ],
    });
    expect(notice).toContain("needs-local-check");
    expect(notice.indexOf("#12 First")).toBeGreaterThan(-1);
    expect(notice.indexOf("#13 Second")).toBeGreaterThan(notice.indexOf("#12 First"));
  });

  it("puts a title on one line, with single spaces", () => {
    const lines = localChecksNotice({
      env: {},
      tickets: [
        { number: 7, title: "a\n  b   c" },
      ],
    }).split("\n");
    expect(lines).toContain("#7 a b c");
  });

  it("cuts a long title at 100 characters", () => {
    const lines = localChecksNotice({
      env: {},
      tickets: [
        {
          number: 9,
          title: "x".repeat(150),
        },
      ],
    }).split("\n");
    expect(lines).toContain(`#9 ${"x".repeat(99)}…`);
  });

  it("lists the first 20 tickets and counts the rest", () => {
    const tickets = Array.from({ length: 23 }, (_, index) => ({ number: index + 1, title: `Ticket ${index + 1}` }));
    const lines = localChecksNotice({ env: {}, tickets }).split("\n");
    expect(lines.filter(line => line.startsWith("#"))).toHaveLength(20);
    expect(lines).toContain("… and 3 more: gh issue list --state open --label needs-local-check");
  });
});

describe("the hook command", () => {
  it("prints nothing and exits 0 when no `gh` can be found", () => {
    const env = { ...process.env, PATH: "", Path: "" };
    delete env.CLAUDE_CODE_REMOTE;
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env });
    expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({ status: 0, stdout: "", stderr: "" });
  });

  it("prints nothing and exits 0 in a cloud container", () => {
    const result = spawnSync(process.execPath, [SCRIPT], {
      encoding: "utf8",
      env: { ...process.env, CLAUDE_CODE_REMOTE: "true" },
    });
    expect({ status: result.status, stdout: result.stdout }).toEqual({ status: 0, stdout: "" });
  });
});
