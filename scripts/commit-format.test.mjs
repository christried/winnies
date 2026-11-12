import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lintMessage, parseLog, selectArguments } from "./commit-format.mjs";
import { parseScopes } from "./commit-scopes.mjs";

// The rule behind CLAUDE.md § Commits: the commit-msg hook and the Attribution job both lint with this configuration.
const claudeMd = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8");
const scopes = parseScopes(claudeMd);

describe("parseScopes", () => {
  it("reads the scopes CLAUDE.md lists, in order", () => {
    expect(scopes).toEqual([
      "tokens",
      "motion",
      "ui",
      "workspace",
      "shared",
      "overlay",
      "landing",
      "changelog",
      "server",
      "deps",
      "ci",
      "agents",
    ]);
  });

  it("takes a scope added to the line with no other edit", () => {
    const edited = claudeMd.replace("`agents`. Add", "`agents`, `commits`. Add");
    expect(parseScopes(edited)).toEqual([...scopes, "commits"]);
  });

  it("throws, naming CLAUDE.md, when the line stops parsing", () => {
    expect(() => parseScopes("## Commits\n\n- Scope list: `ui`, `ci`\n")).toThrow(/CLAUDE\.md § Commits/);
  });
});

describe("lintMessage: what the hook and CI refuse", () => {
  const errorsOf = async message => (await lintMessage(message)).errors.map(error => `${error.name}: ${error.message}`).join("\n");

  it("refuses a header with no scope, and lists the scopes", async () => {
    for (const message of ["ci: x", "feat: x"]) {
      const result = await lintMessage(message);
      expect(result.valid).toBe(false);
      const text = await errorsOf(message);
      for (const scope of scopes) expect(text).toContain(scope);
    }
  });

  it("refuses a scope CLAUDE.md does not list, and lists the scopes", async () => {
    const result = await lintMessage("chore(docs): x");
    expect(result.valid).toBe(false);
    const text = await errorsOf("chore(docs): x");
    for (const scope of scopes) expect(text).toContain(scope);
  });

  it("refuses a scope joined with another", async () => {
    expect((await lintMessage("fix(ui,shared): x")).valid).toBe(false);
    expect((await lintMessage("fix(ui/shared): x")).valid).toBe(false);
  });

  it("refuses a type that is not a Conventional Commits type", async () => {
    expect((await lintMessage("wip(ci): x")).valid).toBe(false);
  });

  it("refuses a capitalised subject (the official subject-case rule)", async () => {
    expect((await lintMessage("fix(ci): Add Thing")).valid).toBe(false);
  });

  it("refuses an empty subject", async () => {
    expect((await lintMessage("fix(ci):")).valid).toBe(false);
  });

  it("names the types in the help text", async () => {
    const { helpUrl } = (await lintMessage("ci: x"));
    for (const type of [
      "feat",
      "fix",
      "chore",
      "docs",
      "test",
      "refactor",
    ]) expect(helpUrl).toContain(type);
    expect(helpUrl).toContain("CLAUDE.md § Commits");
  });

  it("refuses a message that only starts with Merge", async () => {
    expect((await lintMessage("Merge-ish: no scope")).valid).toBe(false);
    expect((await lintMessage("Mergers: x")).valid).toBe(false);
    expect((await lintMessage("Merge things")).valid).toBe(false);
  });
});

describe("lintMessage: what passes", () => {
  it("passes a listed scope", async () => {
    expect((await lintMessage("fix(ci): x")).valid).toBe(true);
    expect((await lintMessage("chore(ci): x")).valid).toBe(true);
  });

  // The human dropped the 100-character body and footer limit (#282): Conventional Commits 1.0.0 has none.
  it("passes a body and a footer line of 120 characters", async () => {
    const line = `${"word ".repeat(23)}end.`;
    expect(line.length).toBeGreaterThan(100);
    expect((await lintMessage(`fix(ci): x\n\n${line}\n\nRefs: ${line}`)).valid).toBe(true);
  });

  it("passes a body with a URL", async () => {
    expect((await lintMessage("docs(agents): link the spec\n\nSee https://www.conventionalcommits.org/en/v1.0.0/#specification for the rule.")).valid).toBe(true);
  });

  it("passes the merge commits and the revert the repository makes", async () => {
    for (const message of [
      "Merge fix/272-review-guards (#272)",
      "Merge redesign into feat/171-tokens",
      "Merge remote-tracking branch 'origin/redesign' into spec/290-before-r1",
      "Merge pull request #205 from christried/spec/195-safety-net",
      "Revert \"feat(ui): add the win toggle\"",
    ]) {
      expect((await lintMessage(message)).valid, message).toBe(true);
    }
  });
});

describe("selectArguments", () => {
  it("excludes what is reachable from the commit the rule applies after", () => {
    expect(selectArguments("a..b", "f".repeat(40))).toEqual(["a..b", `^${"f".repeat(40)}`]);
  });
});

describe("parseLog", () => {
  it("splits the log into commits, a multi-line body intact", () => {
    const log = "aaa111\x00fix(ci): one\x01\nbbb222\x00feat(ui): two\n\nA body line.\n\nAnother paragraph.\x01";
    expect(parseLog(log)).toEqual([
      { sha: "aaa111", message: "fix(ci): one" },
      { sha: "bbb222", message: "feat(ui): two\n\nA body line.\n\nAnother paragraph." },
    ]);
  });

  it("returns nothing for an empty range", () => {
    expect(parseLog("")).toEqual([]);
  });
});
