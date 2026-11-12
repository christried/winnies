import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { findAttribution, findInCommand, findInFile, findInToolCall, isAgentIdentity, pushSelections } from "./attribution.mjs";

// The guard behind CLAUDE.md § Attribution: the git hooks, the CI job and the Claude Code hook all call these.
describe("findAttribution", () => {
  it("passes an ordinary Conventional Commit", () => {
    expect(findAttribution("feat(ui): add the win toggle\n\nThe Counter sets Won at its Target.")).toEqual([]);
  });

  it("passes a message that names Claude Design, which the project works with", () => {
    expect(findAttribution("docs(agents): flag new assets as Claude Design hand-off or own build")).toEqual([]);
  });

  it("finds a co-author trailer, whoever it names and however it is cased", () => {
    expect(findAttribution("fix: x\n\nCo-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>")).toContain("a Co-Authored-By trailer");
    expect(findAttribution("fix: x\n\nco-authored-by: Someone <someone@example.com>")).toContain("a Co-Authored-By trailer");
  });

  it("finds the session trailer", () => {
    expect(findAttribution("fix: x\n\nClaude-Session: https://claude.ai/code/session_abc")).toEqual(expect.arrayContaining(["an agent trailer", "a Claude Code link"]));
  });

  it("finds the footer Claude Code puts under a PR body", () => {
    const body = "## What\n\nThe toggle.\n\n\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)";
    expect(findAttribution(body)).toEqual(expect.arrayContaining(["a \"generated with\" line", "a Claude Code link", "the robot emoji that marks agent output"]));
  });

  it("finds the no-reply address on its own", () => {
    expect(findAttribution("chore: x\n\nSigned-off-by: Bot <noreply@anthropic.com>")).toEqual(["an Anthropic no-reply address"]);
  });
});

describe("isAgentIdentity", () => {
  it("passes the maintainer and GitHub's own committer", () => {
    expect(isAgentIdentity("Chris <chris@example.com>")).toBe(false);
    expect(isAgentIdentity("GitHub <noreply@github.com>")).toBe(false);
  });

  it("finds an agent by name or by address", () => {
    expect(isAgentIdentity("Claude <noreply@anthropic.com>")).toBe(true);
    expect(isAgentIdentity("claude <someone@example.com>")).toBe(true);
    expect(isAgentIdentity("Chris <chris@anthropic.com>")).toBe(true);
    expect(isAgentIdentity("Cursor Agent <cursoragent@cursor.com>")).toBe(true);
  });
});

describe("findInCommand", () => {
  it("passes commands that only read or search", () => {
    expect(findInCommand("grep -rn \"Co-Authored-By\" docs")).toEqual([]);
    expect(findInCommand("git log --format=%B | grep -i co-authored-by")).toEqual([]);
  });

  it("passes a clean commit and a clean PR", () => {
    expect(findInCommand("git commit -m \"feat(ui): add the win toggle\"")).toEqual([]);
    expect(findInCommand("gh pr create --base redesign --title \"feat(ui): win toggle\" --body-file body.md")).toEqual([]);
  });

  it("finds a trailer inside a commit command, where it does not start a line", () => {
    expect(findInCommand("git commit -m \"fix: x\" -m \"Co-Authored-By: Claude <noreply@anthropic.com>\"")).toEqual(expect.arrayContaining(["a Co-Authored-By trailer", "an Anthropic no-reply address"]));
  });

  it("finds the footer in a PR body and in an issue comment", () => {
    expect(findInCommand("gh pr create --body \"Done.\n\nGenerated with Claude Code\"")).toContain("a \"generated with\" line");
    expect(findInCommand("gh issue comment 12 --body \"Verified. https://claude.ai/code/session_abc\"")).toContain("a Claude Code link");
  });

  it("finds every way around the git hooks", () => {
    expect(findInCommand("git commit --no-verify -m \"fix: x\"")).toContain("--no-verify, which skips the attribution hooks");
    expect(findInCommand("git commit -nm \"fix: x\"")).toContain("--no-verify, which skips the attribution hooks");
    expect(findInCommand("git push --no-verify")).toContain("--no-verify, which skips the attribution hooks");
    expect(findInCommand("HUSKY=0 git commit -m \"fix: x\"")).toContain("a switch that turns the git hooks off");
    expect(findInCommand("git config core.hooksPath /dev/null")).toContain("a switch that turns the git hooks off");
  });

  it("finds an agent set as author or committer", () => {
    expect(findInCommand("git commit --author=\"Claude <noreply@anthropic.com>\" -m \"fix: x\"")).toContain("an agent as author or committer");
    expect(findInCommand("git config user.name \"Claude\"")).toContain("an agent as author or committer");
  });

  it("lets a commit message talk about --no-verify", () => {
    expect(findInCommand("cat > msg.txt <<'EOF'\nci: a check --no-verify cannot skip\nEOF\ngit commit -F msg.txt")).toEqual([]);
  });

  it("does not take -n of another git command for --no-verify", () => {
    expect(findInCommand("git log -n 5 && git commit -m \"fix: x\"")).toEqual([]);
  });
});

describe("pushSelections", () => {
  const zero = "0".repeat(40);

  it("selects what the remote branch lacks", () => {
    expect(pushSelections("refs/heads/a aaa refs/heads/a bbb\n")).toEqual([
      ["bbb..aaa"],
    ]);
  });

  it("selects everything no remote has for a new branch", () => {
    expect(pushSelections(`refs/heads/a aaa refs/heads/a ${zero}\n`)).toEqual([
      ["aaa", "--not", "--remotes"],
    ]);
  });

  it("selects nothing for a deleted branch", () => {
    expect(pushSelections(`(delete) ${zero} refs/heads/a bbb\n`)).toEqual([]);
  });
});

// The files a commit or a PR changes: the pre-commit hook and the Attribution job. The walkers are tested in file-metadata.test.mjs.
describe("findInFile", () => {
  const svg = (inside = "") => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest">${inside}<path d="M0 0"/></svg>`);

  it("passes an image without metadata", () => {
    expect(findInFile("public/a.svg", Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0\"/></svg>"))).toEqual([]);
  });

  it("names the file and the manifest", () => {
    const [finding, ...rest] = findInFile("public/a.svg", svg("<metadata><c2pa:manifest>QQ==</c2pa:manifest></metadata>"));
    expect(finding).toMatch(/^public\/a\.svg: carries a C2PA manifest/);
    expect(rest).toEqual([]);
  });

  it("reports a file it cannot read as a finding, not an exception", () => {
    expect(findInFile("public/a.jpg", Buffer.from("<svg/>"))).toEqual([
      expect.stringMatching(/^public\/a\.jpg: cannot be read as jpg \(.+\)$/),
    ]);
  });
});

describe("findInToolCall", () => {
  const footer = "Verified on staging.\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_";

  it("judges the text a GitHub connector tool would write: an issue, a comment, a PR, a merge commit", () => {
    expect(findInToolCall("mcp__github__add_issue_comment", { issue_number: 12, body: footer })).toEqual(expect.arrayContaining(["a \"generated with\" line", "a Claude Code link"]));
    expect(findInToolCall("mcp__github__create_pull_request", { title: "feat(ui): win toggle", body: "Done.\n\nCo-Authored-By: Claude <noreply@anthropic.com>" })).toContain("a Co-Authored-By trailer");
    expect(findInToolCall("mcp__github__merge_pull_request", { pullNumber: 12, commit_title: "Merge feat/12-x (#12)", commit_message: "Generated with Claude Code" })).toContain("a \"generated with\" line");
  });

  it("lets clean text through, and a tool that only reads", () => {
    expect(findInToolCall("mcp__github__issue_write", { method: "create", title: "The Counter keeps its count", body: "## What and why\n\nA cloud session found it." })).toEqual([]);
    expect(findInToolCall("mcp__github__issue_read", { method: "get", issue_number: 12 })).toEqual([]);
  });

  it("judges a shell command as before", () => {
    expect(findInToolCall("Bash", { command: "git commit --no-verify -m \"fix: x\"" })).toContain("--no-verify, which skips the attribution hooks");
    expect(findInToolCall("Bash", { command: "grep -rn \"Co-Authored-By\" docs" })).toEqual([]);
  });
});
