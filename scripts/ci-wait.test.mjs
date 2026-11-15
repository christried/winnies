import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { waitForCi } from "./ci-wait.mjs";

const script = fileURLToPath(new URL("./ci-wait.mjs", import.meta.url));

// A background wait relies on --until-done: a mistyped flag read as the 2.5-minute wait ends it early, and the
// orchestrator reads exit 2 as "still running" (#255). An unknown flag stops the script before any gh call.
describe("ci-wait.mjs", () => {
  it("refuses an unknown flag, names it, and waits for nothing", () => {
    const run = spawnSync(process.execPath, [script, "--until-don"], { encoding: "utf8" });

    expect(run.status).toBe(1);
    expect(run.stdout).toContain("--until-don");
    expect(run.stdout).not.toContain("waiting up to");
  });
});

const SHA = "3e23713aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CI_URL = "https://github.com/christried/winnies/actions/runs/42";

/** What a failed `execFileSync("gh", …)` throws: the child's stderr is what `ghErrorLine` and `retryDecision` read. */
const ghFailure = stderr => Object.assign(new Error("Command failed: gh"), { stderr });
const PAGE_502 = ghFailure("<!DOCTYPE html><html><head><title>Unicorn!</title></head></html>\ngh: HTTP 502");
const NOT_FOUND = ghFailure("gh: Not Found (HTTP 404)");

function ciRun(overrides = {}) {
  return {
    databaseId: 42,
    status: "completed",
    conclusion: "success",
    event: "push",
    url: CI_URL,
    attempt: 1,
    workflowName: "CI",
    ...overrides,
  };
}

/**
 * A `gh` that answers from data. Each route is a pattern for the call's arguments joined by spaces and the answers it
 * gives in turn: a string is stdout, an Error is thrown, and the last answer repeats. A call no route matches throws, so a
 * test cannot reach the real network by a call it did not list. No fake binary on PATH: Windows resolves `gh.exe` only.
 */
function fakeGh(routes) {
  const queues = routes.map(route => [...route.answers]);
  const calls = [];
  function gh(...args) {
    const joined = args.join(" ");
    calls.push(joined);
    const index = routes.findIndex(route => route.when.test(joined));
    if (index === -1)
      throw new Error(`a gh call the test did not list: ${joined}`);
    const queue = queues[index];
    const answer = queue.length > 1
      ? queue.shift()
      : queue[0];
    if (answer instanceof Error)
      throw answer;
    return answer;
  }
  return { gh, calls };
}

const RUNS = /^run list --workflow ci\.yml/;
const NO_ATTRIBUTION_RUNS = {
  when: /^run list --workflow attribution\.yml/,
  answers: ["[]"],
};
const NO_PR = {
  when: /\/commits\/\w+\/pulls$/,
  answers: ["[]"],
};
const JOBS_OF_RUN = /\/actions\/runs\/\d+\/jobs/;
const EARLIER_ATTEMPT = /\/actions\/runs\/\d+\/attempts\/\d+\/jobs/;
const FAILING_LOG = /^run view \d+ --log-failed/;

/** Runs the wait with the reads of a test: nothing sleeps and nothing reaches GitHub. */
async function wait(routes) {
  const { gh, calls } = fakeGh([NO_ATTRIBUTION_RUNS, NO_PR, ...routes]);
  const lines = [];
  const pauses = [];
  const code = await waitForCi({
    sha: SHA,
    expected: ["CI"],
    callMs: 150_000,
    gh,
    pause: ms => pauses.push(ms),
    sleep: async () => {},
    log: line => lines.push(line),
  });
  return {
    code,
    lines,
    text: lines.join("\n"),
    calls,
    pauses,
  };
}

// What the caller does with the exit code: 1 is "red: fix, push", 2 is "not settled: call again". A read GitHub did not
// answer is not a verdict (R2's retro, 14), so it never ends in 1.
describe("ci-wait.mjs waitForCi", () => {
  it("ends with exit 2 and one line when the runs cannot be read after the retries", async () => {
    const { code, lines, text, pauses } = await wait([
      {
        when: RUNS,
        answers: [PAGE_502],
      },
    ]);

    expect(code).toBe(2);
    expect(lines).toHaveLength(1);
    expect(text).toContain("GitHub could not be read");
    expect(text).toContain("run this again");
    expect(text).not.toMatch(/\bred\b/i);
    expect(pauses).toEqual([2_000, 5_000, 10_000]);
  });

  it("ends with exit 2, and does not call it not a red run, when the jobs count of an ended run cannot be read", async () => {
    const { code, text } = await wait([
      {
        when: RUNS,
        answers: [
          JSON.stringify([
            ciRun({ conclusion: "failure" }),
          ]),
        ],
      },
      {
        when: JOBS_OF_RUN,
        answers: [PAGE_502],
      },
    ]);

    expect(code).toBe(2);
    expect(text).toContain("jobs count");
    expect(text).not.toContain("not a red run");
  });

  it("names a run that passed on attempt 2 after the green line, with exit 0", async () => {
    const { code, lines } = await wait([
      {
        when: RUNS,
        answers: [
          JSON.stringify([
            ciRun({ attempt: 2 }),
          ]),
        ],
      },
      {
        when: EARLIER_ATTEMPT,
        answers: [
          JSON.stringify({
            total_count: 1,
            jobs: [
              { name: "test", conclusion: "failure" },
            ],
          }),
        ],
      },
    ]);

    expect(code).toBe(0);
    expect(lines[0]).toMatch(/^green: CI \(push\)/);
    expect(lines[1]).toBe(`passed on attempt 2 after test failed: CI (push) ${CI_URL}/attempts/1`);
  });

  it("keeps exit 0 after the green line when the earlier attempts of a run cannot be read, and says so", async () => {
    const { code, lines } = await wait([
      {
        when: RUNS,
        answers: [
          JSON.stringify([
            ciRun({ attempt: 2 }),
          ]),
        ],
      },
      {
        when: EARLIER_ATTEMPT,
        answers: [PAGE_502],
      },
    ]);

    expect(code).toBe(0);
    expect(lines[0]).toMatch(/^green: CI \(push\)/);
    expect(lines[1]).toBe(`could not read the earlier attempts of ${CI_URL}: it passed on attempt 2 and may be a flake, look at its attempts (docs/agents/delivery.md § A flake at a required check)`);
    expect(lines).toHaveLength(2);
  });

  it("keeps exit 1 for a red run whose failing log cannot be read, and names the command that reads it", async () => {
    const { code, lines } = await wait([
      {
        when: RUNS,
        answers: [
          JSON.stringify([
            ciRun({ conclusion: "failure" }),
          ]),
        ],
      },
      {
        when: JOBS_OF_RUN,
        answers: ["3"],
      },
      {
        when: FAILING_LOG,
        answers: [NOT_FOUND],
      },
    ]);

    expect(code).toBe(1);
    expect(lines[0]).toBe(`failure: CI push ${CI_URL}`);
    expect(lines[1]).toContain("gh run view 42 --log-failed");
    expect(lines.join("\n")).not.toContain("not a red run");
    expect(lines).toHaveLength(2);
  });

  it("gives the verdict of the answer, and no give-up line, when a read fails once and then answers", async () => {
    const { code, lines, pauses } = await wait([
      {
        when: RUNS,
        answers: [
          PAGE_502,
          JSON.stringify([
            ciRun(),
          ]),
        ],
      },
    ]);

    expect(code).toBe(0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^green: CI \(push\)/);
    expect(pauses).toEqual([2_000]);
  });
});
