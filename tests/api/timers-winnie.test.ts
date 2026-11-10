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

function winnieTimer(owner: SignedInOwner | undefined, winnieId: string, action: string): Promise<Response> {
  return api(`/api/winnies/${winnieId}/timer`, { as: owner, method: "POST", json: { action } });
}

async function winnieTimerOk(owner: SignedInOwner, winnieId: string, action: "start" | "stop"): Promise<TimerResponse> {
  const response = await winnieTimer(owner, winnieId, action);
  expect(response.status).toBe(200);
  return response.json();
}

async function challengeTimerOk(owner: SignedInOwner, challengeId: string, action: "start" | "stop"): Promise<TimerResponse> {
  const response = await api(`/api/challenges/${challengeId}/timer`, { as: owner, method: "POST", json: { action } });
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

describe("starting a Winnie", () => {
  it("starting a Winnie starts the Total Timer and no Challenge Timer", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [{ game: "One" }, { game: "Two" }]);

    const started = await winnieTimerOk(owner, winnie.id, "start");

    expect(started.changed).toBe(true);
    expect(started.winnie.totalRunningSince).toMatch(ISO);
    expect(started.winnie.totalAccumulatedSeconds).toBe(0);
    expect(started.serverNow).toMatch(SERVER_NOW);
    expect(Date.parse(started.serverNow)).toBeGreaterThanOrEqual(Date.parse(started.winnie.totalRunningSince!));
    expect(pick(started.winnie, c1.id)).toMatchObject({ runningSince: null, status: "todo", accumulatedSeconds: 0 });
    expect(pick(started.winnie, c2.id)).toMatchObject({ runningSince: null, status: "todo", accumulatedSeconds: 0 });
  });

  it("starting a running Winnie keeps its start", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [{ game: "One" }]);

    const first = await winnieTimerOk(owner, winnie.id, "start");
    const again = await winnieTimerOk(owner, winnie.id, "start");

    // Quirk: a repeated start still reports changed, because the update touches the row (coalesce keeps the stamp).
    expect(again.changed).toBe(true);
    expect(again.winnie.totalRunningSince).toBe(first.winnie.totalRunningSince);
  });

  it("starting a Winnie without Challenges does nothing", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, []);

    const started = await winnieTimerOk(owner, winnie.id, "start");

    expect(started.changed).toBe(false);
    expect(started.winnie.totalRunningSince).toBeNull();
  });

  it("starting a Complete Winnie does nothing", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const won = await api(`/api/challenges/${c1.id}`, { as: owner, method: "PATCH", json: { status: "won" } });
    expect(won.status).toBe(200);

    const started = await winnieTimerOk(owner, winnie.id, "start");

    expect(started.changed).toBe(false);
    expect(started.winnie.totalRunningSince).toBeNull();
  });

  it("starting the Winnie after a pause starts only the Total Timer", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    await challengeTimerOk(owner, c1.id, "start");
    await winnieTimerOk(owner, winnie.id, "stop");

    const resumed = await winnieTimerOk(owner, winnie.id, "start");

    // Today a pause forgets which Challenge Timers ran. The decided "remembering" behaviour will
    // resume them and change this pin.
    expect(resumed.winnie.totalRunningSince).toMatch(ISO);
    expect(pick(resumed.winnie, c1.id).runningSince).toBeNull();
  });
});

describe("pausing a Winnie", () => {
  it("pausing a Winnie that is not running changes nothing", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const paused = await winnieTimerOk(owner, winnie.id, "stop");

    expect(paused.changed).toBe(false);
    expect(paused.winnie.totalRunningSince).toBeNull();
    expect(paused.winnie.totalAccumulatedSeconds).toBe(0);
    expect(pick(paused.winnie, c1.id)).toMatchObject({ runningSince: null, accumulatedSeconds: 0, status: "todo" });
  });

  it("pausing a Winnie leaves a Challenge Timer paused earlier as it was", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    await challengeTimerOk(owner, c1.id, "start");
    const earlier = await challengeTimerOk(owner, c1.id, "stop");
    const noted = pick(earlier.winnie, c1.id).accumulatedSeconds;

    const paused = await winnieTimerOk(owner, winnie.id, "stop");

    expect(paused.changed).toBe(true);
    expect(pick(paused.winnie, c1.id)).toMatchObject({ accumulatedSeconds: noted, runningSince: null });
    expect(pick(await read(owner, winnie.id), c1.id).accumulatedSeconds).toBe(noted);
  });

  // Quirk, not a feature: the handler sends every action except "start" to pause, and the shared
  // action schema also allows "reset".
  it("a Winnie \"reset\" action behaves as pause", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    await challengeTimerOk(owner, c1.id, "start");

    const response = await winnieTimer(owner, winnie.id, "reset");

    expect(response.status).toBe(200);
    const body: TimerResponse = await response.json();
    expect(body.changed).toBe(true);
    expect(body.winnie.totalRunningSince).toBeNull();
    expect(pick(body.winnie, c1.id)).toMatchObject({ runningSince: null, status: "active" });
  });
});

// Each case has its own Owner, so these are independent and run side by side: one 2.5 s wait each.
describe.concurrent("pausing a running Winnie", () => {
  it("pausing a Winnie stops the Total Timer and every running Challenge Timer", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2, c3] } = await winnieWith(owner, [{ game: "One" }, { game: "Two" }, { game: "Three" }]);
    const first = await challengeTimerOk(owner, c1.id, "start");
    const second = await challengeTimerOk(owner, c2.id, "start");

    await sleep(W);
    const paused = await winnieTimerOk(owner, winnie.id, "stop");

    expect(paused.changed).toBe(true);
    expect(paused.winnie.totalRunningSince).toBeNull();
    expectSettledSeconds(paused.winnie.totalAccumulatedSeconds, first.winnie.totalRunningSince!, paused.serverNow);
    for (const [challenge, since] of [[c1, pick(first.winnie, c1.id).runningSince], [c2, pick(second.winnie, c2.id).runningSince]] as const) {
      const stopped = pick(paused.winnie, challenge.id);
      expect(stopped).toMatchObject({ runningSince: null, status: "active" });
      expectSettledSeconds(stopped.accumulatedSeconds, since!, paused.serverNow);
    }
    expect(pick(paused.winnie, c3.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "todo" });
  });
});

describe("refused Winnie timer requests", () => {
  it.each(["start", "stop"])("signed out, a Winnie timer request is rejected (%s)", async (action) => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);

    const rejected = await winnieTimer(undefined, winnie.id, action);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    const seen = await read(owner, winnie.id);
    expect(seen.totalRunningSince).toBeNull();
    expect(pick(seen, c1.id)).toMatchObject({ runningSince: null, status: "todo" });
  });

  it("signed out beats a bad id and a bad body", async () => {
    const rejected = await api("/api/winnies/not-a-uuid/timer", { method: "POST", json: {} });

    expect(rejected.status).toBe(401);
  });

  it.each(["start", "stop"])("another Owner cannot start or pause someone else's Winnie (%s)", async (action) => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [{ game: "One" }]);
    const started = await challengeTimerOk(owner, c1.id, "start");

    await expectError(await winnieTimer(other, winnie.id, action), 403, "Not your Winnie.");

    // A pause would have stopped both timers.
    const seen = await read(owner, winnie.id);
    expect(seen.totalRunningSince).toBe(started.winnie.totalRunningSince);
    expect(pick(seen, c1.id).runningSince).toBe(pick(started.winnie, c1.id).runningSince);
  });

  it("a timer request for a deleted Winnie is refused like another Owner's", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [{ game: "One" }]);
    const deleted = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });
    expect(deleted.status).toBe(200);

    await expectError(await winnieTimer(owner, winnie.id, "start"), 403, "Not your Winnie.");
  });

  it("a timer request for an unknown Winnie id is refused", async () => {
    const owner = await signInAsOwner();

    await expectError(await winnieTimer(owner, crypto.randomUUID(), "start"), 403, "Not your Winnie.");
  });

  it("an id that is not a uuid is a validation error", async () => {
    const owner = await signInAsOwner();

    await expectError(await winnieTimer(owner, "not-a-uuid", "start"), 400, "Validation Error");
  });

  it("an unknown action or a missing body is a validation error", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [{ game: "One" }]);

    const unknown = await winnieTimer(owner, winnie.id, "pause");
    expect(unknown.status).toBe(422);
    expect((await unknown.json()).data.fieldErrors).toHaveProperty("action");

    const missing = await api(`/api/winnies/${winnie.id}/timer`, { as: owner, method: "POST" });
    expect(missing.status).toBe(422);
  });
});
