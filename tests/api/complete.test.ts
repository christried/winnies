import type { SignedInOwner } from "../support/owner";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

interface ChallengeRow {
  id: string;
  status: string;
  accumulatedSeconds: number;
  runningSince: string | null;
}

interface WinnieRow {
  id: string;
  shareSlug: string;
  totalAccumulatedSeconds: number;
  totalRunningSince: string | null;
  challenges: ChallengeRow[];
}

interface TimerResponse {
  changed: boolean;
  winnie: WinnieRow;
  serverNow: string;
}

// The one wait every sleeping case makes. A timer started before it and stopped after it has run at
// least this long, however loaded the machine is, so the lower bounds below come from this and
// never from the server.
const W = 2500;

// Fixtures: these call endpoints owned by other tickets to set state up; only the Complete rules are asserted.
async function winnieWith<const T extends readonly { game: string; target?: number }[]>(owner: SignedInOwner, inputs: T) {
  const created = await api("/api/winnies", {
    as: owner,
    method: "POST",
    json: { name: "Complete" },
  });
  expect(created.status).toBe(200);
  const winnie: { id: string; shareSlug: string } = await created.json();

  const challenges: ChallengeRow[] = [];
  for (const input of inputs) {
    const challenge = await api(`/api/winnies/${winnie.id}/challenges`, { as: owner, method: "POST", json: input });
    expect(challenge.status).toBe(200);
    challenges.push(await challenge.json());
  }
  return { winnie, challenges: challenges as { -readonly [K in keyof T]: ChallengeRow } };
}

async function startChallenge(owner: SignedInOwner, challengeId: string): Promise<TimerResponse> {
  const response = await api(`/api/challenges/${challengeId}/timer`, {
    as: owner,
    method: "POST",
    json: { action: "start" },
  });
  expect(response.status).toBe(200);
  return response.json();
}

// PATCH with a status: "won" wins, anything else un-wins. Returns the Challenge row.
async function setStatus(owner: SignedInOwner, challengeId: string, status: string): Promise<ChallengeRow> {
  const response = await api(`/api/challenges/${challengeId}`, {
    as: owner,
    method: "PATCH",
    json: { status },
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function read(owner: SignedInOwner, winnieId: string): Promise<WinnieRow> {
  const response = await api(`/api/winnies/${winnieId}`, { as: owner });
  expect(response.status).toBe(200);
  return response.json();
}

function pick(winnie: WinnieRow, challengeId: string): ChallengeRow {
  const found = winnie.challenges.find(challenge => challenge.id === challengeId);
  if (!found)
    throw new Error(`Challenge ${challengeId} is not on the Winnie`);
  return found;
}

// The API stores no Complete flag: a Winnie is Complete when it has Challenges and all are Won.
function isComplete(winnie: WinnieRow): boolean {
  return winnie.challenges.length > 0 && winnie.challenges.every(challenge => challenge.status === "won");
}

describe("winning a Challenge", () => {
  it("winning the only Challenge of a never started Winnie makes it Complete", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const won = await setStatus(owner, c1.id, "won");

    expect(won).toMatchObject({ id: c1.id, status: "won" });
    const seen = await read(owner, winnie.id);
    expect(isComplete(seen)).toBe(true);
    expect(seen.totalRunningSince).toBeNull();
    expect(seen.totalAccumulatedSeconds).toBe(0);
  });

  it("winning the last Challenge through its Counter completes the Winnie", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One", target: 2 },
    ]);
    const step = () => api(`/api/challenges/${c1.id}/counter`, {
      as: owner,
      method: "PATCH",
      json: { op: "step", delta: 1 },
    });

    const first = await step();
    expect(first.status).toBe(200);
    expect(isComplete(await read(owner, winnie.id))).toBe(false);
    const second = await step();

    expect(second.status).toBe(200);
    expect((await second.json()).status).toBe("won");
    const seen = await read(owner, winnie.id);
    expect(isComplete(seen)).toBe(true);
    expect(seen.totalRunningSince).toBeNull();
  });
});

describe("un-winning a Challenge", () => {
  it("un-winning a Challenge of a Complete Winnie makes it not Complete and starts nothing", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    await setStatus(owner, c1.id, "won");
    expect(isComplete(await read(owner, winnie.id))).toBe(true);

    const reopened = await setStatus(owner, c1.id, "todo");

    expect(reopened.status).toBe("todo");
    const seen = await read(owner, winnie.id);
    expect(isComplete(seen)).toBe(false);
    expect(seen.totalRunningSince).toBeNull();
    expect(pick(seen, c1.id).runningSince).toBeNull();

    // Winning it again completes the Winnie again, with the Total Timer still stopped.
    await setStatus(owner, c1.id, "won");
    const again = await read(owner, winnie.id);
    expect(isComplete(again)).toBe(true);
    expect(again.totalRunningSince).toBeNull();
  });
});

describe("deleting a Challenge", () => {
  it("deleting the last open Challenge makes the Winnie Complete", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "One" },
      { game: "Two" },
    ]);
    await setStatus(owner, c1.id, "won");
    await startChallenge(owner, c2.id);

    const deleted = await api(`/api/challenges/${c2.id}`, { as: owner, method: "DELETE" });

    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: c2.id, complete: true });
    const seen = await read(owner, winnie.id);
    expect(seen.challenges.map(challenge => challenge.id)).toEqual([c1.id]);
    expect(isComplete(seen)).toBe(true);
    // Deleting the last open Challenge stops the Total Timer, as winning it does.
    expect(seen.totalRunningSince).toBeNull();
  });
});

// Each case has its own Owner, so these are independent and run side by side: one 2.5 s wait each.
describe.concurrent("completing a Winnie with running timers", () => {
  it("winning the last open Challenge completes the Winnie and stops all timers", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "One" },
      { game: "Two" },
    ]);
    const first = await startChallenge(owner, c1.id);
    await startChallenge(owner, c2.id);
    const totalStart = first.winnie.totalRunningSince!;

    await sleep(W);

    // Not the last open Challenge: its timer stops, the others and the Total Timer keep running.
    const wonFirst = await setStatus(owner, c1.id, "won");
    expect(wonFirst).toMatchObject({ status: "won", runningSince: null });
    expect(wonFirst.accumulatedSeconds).toBeGreaterThanOrEqual(2);
    const midway = await read(owner, winnie.id);
    expect(isComplete(midway)).toBe(false);
    expect(pick(midway, c2.id)).toMatchObject({ status: "active" });
    expect(pick(midway, c2.id).runningSince).not.toBeNull();
    expect(midway.totalRunningSince).toBe(totalStart);

    // The last one: everything stops.
    await setStatus(owner, c2.id, "won");
    const seen = await read(owner, winnie.id);
    expect(isComplete(seen)).toBe(true);
    for (const challenge of seen.challenges)
      expect(challenge.runningSince).toBeNull();
    expect(pick(seen, c2.id).accumulatedSeconds).toBeGreaterThanOrEqual(2);
    expect(seen.totalRunningSince).toBeNull();
    // The Owner's read has no serverNow; the share endpoint's, taken after the stop, bounds the stamp.
    const { serverNow } = await (await api(`/api/share/${winnie.shareSlug}`)).json();
    expect(seen.totalAccumulatedSeconds).toBeGreaterThanOrEqual(Math.floor(W / 1000));
    expect(seen.totalAccumulatedSeconds).toBeLessThanOrEqual(Math.ceil((Date.parse(serverNow) - Date.parse(totalStart)) / 1000) + 1);
  });

  it("un-winning a Challenge that has time puts it back to active", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    await startChallenge(owner, c1.id);
    await sleep(W);
    const won = await setStatus(owner, c1.id, "won");
    expect(won.accumulatedSeconds).toBeGreaterThanOrEqual(2);
    expect(isComplete(await read(owner, winnie.id))).toBe(true);

    // The requested value is ignored: a Challenge with time goes back to active, not to todo.
    const reopened = await setStatus(owner, c1.id, "todo");

    expect(reopened.status).toBe("active");
    expect(reopened.runningSince).toBeNull();
    const seen = await read(owner, winnie.id);
    expect(isComplete(seen)).toBe(false);
    expect(seen.totalRunningSince).toBeNull();
    expect(pick(seen, c1.id).runningSince).toBeNull();
  });
});
