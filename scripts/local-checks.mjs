// Tells a session that starts on the human's machine which tickets wait for a local check, so that a ticket whose checks
// are met does not sit for a day (R1's retro, item 9: no session listed them as delivery.md § Issues asks). A Claude Code
// SessionStart hook in .claude/settings.json runs it; the plain text it prints reaches the session as context.
//
//   node scripts/local-checks.mjs
//
// It never fails or delays a session's start: it prints nothing in a cloud container, with no such ticket open, and when
// GitHub does not answer within five seconds or `gh` fails, and in every one of those cases it exits 0. The decision
// of what to print is localChecksNotice; the rest of this file reads the list and cannot throw.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isCloudContainer } from "./environment.mjs";

const READ_TIMEOUT_MS = 5000;
const READ_LIMIT = 50;
const MAX_LISTED = 20;
const MAX_TITLE = 100;
const LIST_COMMAND = "gh issue list --state open --label needs-local-check";

/** A title on one line, cut at MAX_TITLE: it is text from GitHub that goes into a session's context. */
function oneLine(title) {
  const line = title.replace(/\s+/g, " ").trim();
  return line.length > MAX_TITLE
    ? `${line.slice(0, MAX_TITLE - 1)}…`
    : line;
}

/**
 * What a session that has just started is told about the tickets waiting for a local check.
 *
 * @param {object} input
 * @param {Record<string, string | undefined>} input.env the process environment
 * @param {{ number: number, title: string }[] | null} input.tickets the open `needs-local-check` tickets, or null when they could not be read
 * @returns {string} the text to print; empty in a cloud container, for no ticket and for a failed read
 */
export function localChecksNotice({ env, tickets }) {
  if (isCloudContainer(env) || tickets === null || tickets.length === 0)
    return "";
  const listed = tickets.slice(0, MAX_LISTED).map(({ number, title }) => `#${number} ${oneLine(title)}`);
  const more = tickets.length - listed.length;
  return [
    "Tickets waiting for a local check (open, labelled `needs-local-check`; docs/agents/delivery.md § Issues):",
    ...listed,
    ...(more > 0
      ? [`… and ${more} more: ${LIST_COMMAND}`]
      : []),
    "Name them to the human in your first reply. Each one's \"Local checks\" comment says what to run, and § Issues what to do with the result.",
  ].join("\n");
}

/** The open `needs-local-check` tickets, or null when GitHub did not answer in time, `gh` failed or its answer is not the list. */
function readTickets() {
  try {
    const output = execFileSync("gh", [
      "issue",
      "list",
      "--repo",
      "christried/winnies",
      "--state",
      "open",
      "--label",
      "needs-local-check",
      "--json",
      "number,title",
      "--limit",
      String(READ_LIMIT),
    ], {
      encoding: "utf8",
      timeout: READ_TIMEOUT_MS,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const tickets = JSON.parse(output);
    return Array.isArray(tickets) && tickets.every(ticket => Number.isInteger(ticket?.number) && typeof ticket.title === "string")
      ? tickets
      : null;
  }
  catch {
    return null;
  }
}

function main() {
  try {
    // A cloud container's GitHub refuses `gh issue list` (cloud.md § GitHub): no read is worth the wait there.
    const tickets = isCloudContainer(process.env)
      ? null
      : readTickets();
    const notice = localChecksNotice({ env: process.env, tickets });
    if (notice)
      console.log(notice);
  }
  catch {
    // A start is never failed for this list.
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(main());
