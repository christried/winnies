import type { SignedInOwner } from "../support/owner";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { elapsedSeconds } from "../../shared/utils/timer";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

type TimerAction = "start" | "stop" | "reset";

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

// A timestamp as JSON carries it: a Date turned into an ISO-8601 string.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// serverNow is the raw text of Postgres's `select now()`, not an ISO string: a space instead of the T,
// microseconds, and the session's UTC offset. Date.parse reads it, which is all a client does with it.
const SERVER_NOW = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}$/;

// The one wait every sleeping case makes. A timer started before it and stopped after it has run at
// least this long, however loaded the machine is, so the lower bounds below come from this and
// never from the server.
const W = 2500;

// Fixtures: these call endpoints owned by other tickets to set state up; no test asserts on them.
async function winnieWith<const T extends readonly { game: string; target?: number }[]>(owner: SignedInOwner, inputs: T) {
  const created = await api("/api/winnies", { as: owner, method: "POST", json: { name: "Timers" } });
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

function timer(owner: SignedInOwner | undefined, challengeId: string, action: TimerAction): Promise<Response> {
  return api(`/api/challenges/${challengeId}/timer`, { as: owner, method: "POST", json: { action } });
}

async function timerOk(owner: SignedInOwner, challengeId: string, action: "start" | "stop"): Promise<TimerResponse> {
  const response = await timer(owner, challengeId, action);
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

// The stop stamp is at most the serverNow of the stop response, so the accumulated time cannot
// exceed the gap between the start stamp and that serverNow (rounded up, plus the rounding of the
// server's cast). Load widens both sides alike, so no tolerance needs tuning. A wrong unit
// (milliseconds) would be thousands.
function expectSettledSeconds(accumulated: number, startedSince: string, stopServerNow: string) {
  expect(accumulated).toBeGreaterThanOrEqual(Math.floor(W / 1000));
  expect(accumulated).toBeLessThanOrEqual(Math.ceil((Date.parse(stopServerNow) - Date.parse(startedSince)) / 1000) + 1);
}

async function expectError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expect((await response.json()).statusMessage).toBe(message);
}

describe("starting a Challenge Timer", () => {
  it("starting a Challenge Timer starts it and the Total Timer", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1, c2] } = await winnieWith(owner, [{ game: "One" }, { game: "Two" }]);

    const started = await timerOk(owner, c1.id, "start");

    expect(started.changed).toBe(true);
    expect(pick(started.winnie, c1.id)).toMatchObject({ status: "active", accumulatedSeconds: 0 });
    expect(pick(started.winnie, c1.id).runningSince).toMatch(ISO);
    expect(pick(started.winnie, c2.id)).toMatchObject({ status: "todo", accumulatedSeconds: 0, runningSince: null });
    expect(started.winnie.totalRunningSince).toMatch(ISO);
    expect(started.winnie.totalAccumulatedSeconds).toBe(0);
    // serverNow is the database clock that stamped both starts, so it is never earlier than they are.
    expect(started.serverNow).toMatch(SERVER_NOW);
    expect(Date.parse(started.serverNow)).toBeGreaterThanOrEqual(Date.parse(pick(started.winnie, c1.id).runningSince!));
    expect(Date.parse(started.serverNow)).toBeGreaterThanOrEqual(Date.parse(started.winnie.totalRunningSince!));
  });

  it("starting a second Challenge Timer leaves the first running and the Total Timer's start unchanged", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [{ game: "One" }, { game: "Two" }]);

    const first = await timerOk(owner, c1.id, "start");
    const second = await timerOk(owner, c2.id, "start");

    expect(second.changed).toBe(true);
    const seen = await read(owner, winnie.id);
    expect(pick(seen, c1.id).runningSince).toBe(pick(first.winnie, c1.id).runningSince);
    expect(pick(seen, c2.id).runningSince).toMatch(ISO);
    expect(pick(seen, c1.id).status).toBe("active");
    expect(pick(seen, c2.id).status).toBe("active");
    expect(seen.totalRunningSince).toBe(first.winnie.totalRunningSince);
  });

  it("starting a running Challenge Timer again keeps its start", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const first = await timerOk(owner, c1.id, "start");
    const again = await timerOk(owner, c1.id, "start");

    // Quirk: a repeated start still reports changed, because the update touches the row (coalesce keeps the stamp).
    expect(again.changed).toBe(true);
    expect(pick(again.winnie, c1.id).runningSince).toBe(pick(first.winnie, c1.id).runningSince);
    expect(again.winnie.totalRunningSince).toBe(first.winnie.totalRunningSince);
    expect((await read(owner, winnie.id)).totalRunningSince).toBe(first.winnie.totalRunningSince);
  });

  it("starting a Won Challenge starts nothing", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const won = await api(`/api/challenges/${c1.id}`, { as: owner, method: "PATCH", json: { status: "won" } });
    expect(won.status).toBe(200);

    const started = await timerOk(owner, c1.id, "start");

    expect(started.changed).toBe(false);
    expect(started.winnie.totalRunningSince).toBeNull();
    expect(pick(started.winnie, c1.id)).toMatchObject({ status: "won", runningSince: null });
  });
});

describe("pausing a Challenge Timer that never ran", () => {
  it("pausing a Challenge Timer that never ran changes nothing", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const paused = await timerOk(owner, c1.id, "stop");

    expect(paused.changed).toBe(false);
    expect(pick(paused.winnie, c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "todo" });
    expect(paused.winnie.totalRunningSince).toBeNull();
  });
});

describe("resetting a Challenge Timer", () => {
  it("resetting a running Challenge Timer stops it at zero and leaves the Total Timer running", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [{ game: "One" }, { game: "Two" }]);
    await timerOk(owner, c1.id, "start");

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    const body = await reset.json();
    expect(body.changed).toBe(true);
    expect(body.serverNow).toMatch(SERVER_NOW);
    expect(body).not.toHaveProperty("winnie");
    const seen = await read(owner, winnie.id);
    expect(pick(seen, c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "active" });
    expect(seen.totalRunningSince).toMatch(ISO);
    expect(pick(seen, c2.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "todo" });
  });

  it("resetting a Won Challenge's timer works and keeps it Won", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const won = await api(`/api/challenges/${c1.id}`, { as: owner, method: "PATCH", json: { status: "won" } });
    expect(won.status).toBe(200);

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    expect((await reset.json()).changed).toBe(true);
    expect(pick(await read(owner, winnie.id), c1.id).status).toBe("won");
  });
});

// Each case has its own Owner, so these are independent and run side by side: one 2.5 s wait each.
describe.concurrent("a Challenge Timer over time", () => {
  it("pausing a Challenge Timer stops it and leaves the Total Timer running", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const started = await timerOk(owner, c1.id, "start");
    const startedSince = pick(started.winnie, c1.id).runningSince!;

    await sleep(W);
    const paused = await timerOk(owner, c1.id, "stop");

    expect(paused.changed).toBe(true);
    const stopped = pick(paused.winnie, c1.id);
    expect(stopped).toMatchObject({ runningSince: null, status: "active" });
    expectSettledSeconds(stopped.accumulatedSeconds, startedSince, paused.serverNow);
    expect(paused.winnie.totalRunningSince).toBe(started.winnie.totalRunningSince);
    expect(paused.winnie.totalAccumulatedSeconds).toBe(0);

    const again = await timerOk(owner, c1.id, "stop");
    expect(again.changed).toBe(false);
    expect(pick(again.winnie, c1.id).accumulatedSeconds).toBe(stopped.accumulatedSeconds);
    expect((await read(owner, winnie.id)).totalRunningSince).toBe(started.winnie.totalRunningSince);
  });

  it("resetting a stopped Challenge Timer with time on it zeroes it", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    await timerOk(owner, c1.id, "start");
    await sleep(W);
    const paused = await timerOk(owner, c1.id, "stop");
    expect(pick(paused.winnie, c1.id).accumulatedSeconds).toBeGreaterThanOrEqual(2);

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    expect((await reset.json()).changed).toBe(true);
    expect(pick(await read(owner, winnie.id), c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null });
  });

  it("elapsed time reads against serverNow while a timer runs and after it stops", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const started = await timerOk(owner, c1.id, "start");
    const running = pick(started.winnie, c1.id);
    const startedAt = Date.parse(started.serverNow);
    expect(startedAt).toBeGreaterThanOrEqual(Date.parse(running.runningSince!));
    // Only a guard against a wrong unit: the real lower bounds come from the sleep below.
    expect(elapsedSeconds(running, startedAt)).toBeGreaterThanOrEqual(0);
    expect(elapsedSeconds(running, startedAt)).toBeLessThanOrEqual(30);

    await sleep(W);

    // A Viewer's read carries serverNow (the Owner's GET of the Winnie does not).
    const shared = await (await api(`/api/share/${winnie.shareSlug}`)).json();
    const sharedNow = Date.parse(shared.serverNow);
    expect(elapsedSeconds(shared.winnie.challenges[0], sharedNow)).toBeGreaterThanOrEqual(2);
    expect(elapsedSeconds({ accumulatedSeconds: shared.winnie.totalAccumulatedSeconds, runningSince: shared.winnie.totalRunningSince }, sharedNow)).toBeGreaterThanOrEqual(2);

    const paused = await timerOk(owner, c1.id, "stop");
    const stopped = pick(paused.winnie, c1.id);
    expectSettledSeconds(stopped.accumulatedSeconds, running.runningSince!, paused.serverNow);
    // A stopped timer reads the same whatever the clock says: an hour later, still its accumulated seconds.
    expect(elapsedSeconds(stopped, Date.parse(paused.serverNow) + 3_600_000)).toBe(stopped.accumulatedSeconds);
    // The Total Timer still runs and still reads at least the slept time.
    const total = { accumulatedSeconds: paused.winnie.totalAccumulatedSeconds, runningSince: paused.winnie.totalRunningSince };
    expect(total.runningSince).not.toBeNull();
    expect(elapsedSeconds(total, Date.parse(paused.serverNow))).toBeGreaterThanOrEqual(2);
  });
});

describe("refused Challenge timer requests", () => {
  const actions: TimerAction[] = ["start", "stop", "reset"];

  it.each(actions)("signed out, a Challenge timer request is rejected (%s)", async (action) => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const rejected = await timer(undefined, c1.id, action);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    const seen = await read(owner, winnie.id);
    expect(pick(seen, c1.id)).toMatchObject({ status: "todo", accumulatedSeconds: 0, runningSince: null });
    expect(seen.totalRunningSince).toBeNull();
  });

  it("signed out beats a bad id and a bad body", async () => {
    const rejected = await api("/api/challenges/not-a-uuid/timer", { method: "POST", json: {} });

    expect(rejected.status).toBe(401);
  });

  it.each(actions)("another Owner cannot start, pause or reset someone else's timers (%s)", async (action) => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const started = await timerOk(owner, c1.id, "start");

    await expectError(await timer(other, c1.id, action), 403, "Not your Challenge.");

    // A reset or a pause would have stopped it.
    const seen = await read(owner, winnie.id);
    expect(pick(seen, c1.id).runningSince).toBe(pick(started.winnie, c1.id).runningSince);
    expect(seen.totalRunningSince).toBe(started.winnie.totalRunningSince);
  });

  it("a timer request for a deleted Winnie's Challenge is refused like another Owner's", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const deleted = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });
    expect(deleted.status).toBe(200);

    await expectError(await timer(owner, c1.id, "start"), 403, "Not your Challenge.");
  });

  it("a timer request for an unknown Challenge id is refused", async () => {
    const owner = await signInAsOwner();

    await expectError(await timer(owner, crypto.randomUUID(), "start"), 403, "Not your Challenge.");
  });

  it("an id that is not a uuid is a validation error", async () => {
    const owner = await signInAsOwner();

    await expectError(await timer(owner, "not-a-uuid", "start"), 400, "Validation Error");
  });

  it("an unknown action or a missing body is a validation error", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const unknown = await api(`/api/challenges/${c1.id}/timer`, { as: owner, method: "POST", json: { action: "pause" } });
    expect(unknown.status).toBe(422);
    expect((await unknown.json()).data.fieldErrors).toHaveProperty("action");

    const missing = await api(`/api/challenges/${c1.id}/timer`, { as: owner, method: "POST" });
    expect(missing.status).toBe(422);
  });
});
