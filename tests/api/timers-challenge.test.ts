import type { SignedInOwner } from "../support/owner";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { elapsedSeconds } from "../../shared/utils/timer";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";
import { challengeTimerOk, expectError, expectSettledSeconds, findChallenge, ISO, MIN_RUN_MS, readWinnie, SERVER_NOW, winnieWith } from "./helpers";

type TimerAction = "start" | "stop" | "reset";

function timer(owner: SignedInOwner | undefined, challengeId: string, action: TimerAction): Promise<Response> {
  return api(`/api/challenges/${challengeId}/timer`, {
    as: owner,
    method: "POST",
    json: { action },
  });
}

describe("starting a Challenge Timer", () => {
  it("starting a Challenge Timer starts it and the Total Timer", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "One" },
      { game: "Two" },
    ]);

    const started = await challengeTimerOk(owner, c1.id, "start");

    expect(started.changed).toBe(true);
    expect(findChallenge(started.winnie, c1.id)).toMatchObject({ status: "active", accumulatedSeconds: 0 });
    expect(findChallenge(started.winnie, c1.id).runningSince).toMatch(ISO);
    expect(findChallenge(started.winnie, c2.id)).toMatchObject({ status: "todo", accumulatedSeconds: 0, runningSince: null });
    expect(started.winnie.totalRunningSince).toMatch(ISO);
    expect(started.winnie.totalAccumulatedSeconds).toBe(0);
    // serverNow is the database clock that stamped both starts, so it is never earlier than they are.
    expect(started.serverNow).toMatch(SERVER_NOW);
    expect(Date.parse(started.serverNow)).toBeGreaterThanOrEqual(Date.parse(findChallenge(started.winnie, c1.id).runningSince!));
    expect(Date.parse(started.serverNow)).toBeGreaterThanOrEqual(Date.parse(started.winnie.totalRunningSince!));
  });

  it("starting a second Challenge Timer leaves the first running and the Total Timer's start unchanged", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "One" },
      { game: "Two" },
    ]);

    const first = await challengeTimerOk(owner, c1.id, "start");
    const second = await challengeTimerOk(owner, c2.id, "start");

    expect(second.changed).toBe(true);
    const seen = await readWinnie(owner, winnie.id);
    expect(findChallenge(seen, c1.id).runningSince).toBe(findChallenge(first.winnie, c1.id).runningSince);
    expect(findChallenge(seen, c2.id).runningSince).toMatch(ISO);
    expect(findChallenge(seen, c1.id).status).toBe("active");
    expect(findChallenge(seen, c2.id).status).toBe("active");
    expect(seen.totalRunningSince).toBe(first.winnie.totalRunningSince);
  });

  it("starting a running Challenge Timer again keeps its start", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const first = await challengeTimerOk(owner, c1.id, "start");
    const again = await challengeTimerOk(owner, c1.id, "start");

    // Quirk: a repeated start still reports changed, because the update touches the row (coalesce keeps the stamp).
    expect(again.changed).toBe(true);
    expect(findChallenge(again.winnie, c1.id).runningSince).toBe(findChallenge(first.winnie, c1.id).runningSince);
    expect(again.winnie.totalRunningSince).toBe(first.winnie.totalRunningSince);
    expect((await readWinnie(owner, winnie.id)).totalRunningSince).toBe(first.winnie.totalRunningSince);
  });

  it("starting a Won Challenge starts nothing", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    const won = await api(`/api/challenges/${c1.id}`, {
      as: owner,
      method: "PATCH",
      json: { status: "won" },
    });
    expect(won.status).toBe(200);

    const started = await challengeTimerOk(owner, c1.id, "start");

    expect(started.changed).toBe(false);
    expect(started.winnie.totalRunningSince).toBeNull();
    expect(findChallenge(started.winnie, c1.id)).toMatchObject({ status: "won", runningSince: null });
  });
});

describe("pausing a Challenge Timer that never ran", () => {
  it("pausing a Challenge Timer that never ran changes nothing", async () => {
    const owner = await signInAsOwner();
    const { challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const paused = await challengeTimerOk(owner, c1.id, "stop");

    expect(paused.changed).toBe(false);
    expect(findChallenge(paused.winnie, c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "todo" });
    expect(paused.winnie.totalRunningSince).toBeNull();
  });
});

describe("resetting a Challenge Timer", () => {
  it("resetting a running Challenge Timer stops it at zero and leaves the Total Timer running", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "One" },
      { game: "Two" },
    ]);
    await challengeTimerOk(owner, c1.id, "start");

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    const body = await reset.json();
    expect(body.changed).toBe(true);
    expect(body.serverNow).toMatch(SERVER_NOW);
    expect(body).not.toHaveProperty("winnie");
    const seen = await readWinnie(owner, winnie.id);
    expect(findChallenge(seen, c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "active" });
    expect(seen.totalRunningSince).toMatch(ISO);
    expect(findChallenge(seen, c2.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null, status: "todo" });
  });

  it("resetting a Won Challenge's timer works and keeps it Won", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    const won = await api(`/api/challenges/${c1.id}`, {
      as: owner,
      method: "PATCH",
      json: { status: "won" },
    });
    expect(won.status).toBe(200);

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    expect((await reset.json()).changed).toBe(true);
    expect(findChallenge(await readWinnie(owner, winnie.id), c1.id).status).toBe("won");
  });
});

// Each case has its own Owner, so these are independent and run side by side: one 2.5 s wait each.
describe.concurrent("a Challenge Timer over time", () => {
  it("pausing a Challenge Timer stops it and leaves the Total Timer running", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    const started = await challengeTimerOk(owner, c1.id, "start");
    const startedSince = findChallenge(started.winnie, c1.id).runningSince!;

    await sleep(MIN_RUN_MS);
    const paused = await challengeTimerOk(owner, c1.id, "stop");

    expect(paused.changed).toBe(true);
    const stopped = findChallenge(paused.winnie, c1.id);
    expect(stopped).toMatchObject({ runningSince: null, status: "active" });
    expectSettledSeconds(stopped.accumulatedSeconds, startedSince, paused.serverNow);
    expect(paused.winnie.totalRunningSince).toBe(started.winnie.totalRunningSince);
    expect(paused.winnie.totalAccumulatedSeconds).toBe(0);

    const again = await challengeTimerOk(owner, c1.id, "stop");
    expect(again.changed).toBe(false);
    expect(findChallenge(again.winnie, c1.id).accumulatedSeconds).toBe(stopped.accumulatedSeconds);
    expect((await readWinnie(owner, winnie.id)).totalRunningSince).toBe(started.winnie.totalRunningSince);
  });

  it("resetting a stopped Challenge Timer with time on it zeroes it", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    await challengeTimerOk(owner, c1.id, "start");
    await sleep(MIN_RUN_MS);
    const paused = await challengeTimerOk(owner, c1.id, "stop");
    expect(findChallenge(paused.winnie, c1.id).accumulatedSeconds).toBeGreaterThanOrEqual(2);

    const reset = await timer(owner, c1.id, "reset");

    expect(reset.status).toBe(200);
    expect((await reset.json()).changed).toBe(true);
    expect(findChallenge(await readWinnie(owner, winnie.id), c1.id)).toMatchObject({ accumulatedSeconds: 0, runningSince: null });
  });

  it("elapsed time reads against serverNow while a timer runs and after it stops", { timeout: 30_000 }, async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const started = await challengeTimerOk(owner, c1.id, "start");
    const running = findChallenge(started.winnie, c1.id);
    const startedAt = Date.parse(started.serverNow);
    expect(startedAt).toBeGreaterThanOrEqual(Date.parse(running.runningSince!));
    // Only a guard against a wrong unit: the real lower bounds come from the sleep below.
    expect(elapsedSeconds(running, startedAt)).toBeGreaterThanOrEqual(0);
    expect(elapsedSeconds(running, startedAt)).toBeLessThanOrEqual(30);

    await sleep(MIN_RUN_MS);

    // A Viewer's read carries serverNow (the Owner's GET of the Winnie does not).
    const shared = await (await api(`/api/share/${winnie.shareSlug}`)).json();
    const sharedNow = Date.parse(shared.serverNow);
    expect(elapsedSeconds(shared.winnie.challenges[0], sharedNow)).toBeGreaterThanOrEqual(2);
    expect(elapsedSeconds({ accumulatedSeconds: shared.winnie.totalAccumulatedSeconds, runningSince: shared.winnie.totalRunningSince }, sharedNow)).toBeGreaterThanOrEqual(2);

    const paused = await challengeTimerOk(owner, c1.id, "stop");
    const stopped = findChallenge(paused.winnie, c1.id);
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
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const rejected = await timer(undefined, c1.id, action);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    const seen = await readWinnie(owner, winnie.id);
    expect(findChallenge(seen, c1.id)).toMatchObject({ status: "todo", accumulatedSeconds: 0, runningSince: null });
    expect(seen.totalRunningSince).toBeNull();
  });

  it("signed out beats a bad id and a bad body", async () => {
    const rejected = await api("/api/challenges/not-a-uuid/timer", { method: "POST", json: {} });

    expect(rejected.status).toBe(401);
  });

  it.each(actions)("another Owner cannot start, pause or reset someone else's timers (%s)", async (action) => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
    const started = await challengeTimerOk(owner, c1.id, "start");

    await expectError(await timer(other, c1.id, action), 403, "Not your Challenge.");

    // A reset or a pause would have stopped it.
    const seen = await readWinnie(owner, winnie.id);
    expect(findChallenge(seen, c1.id).runningSince).toBe(findChallenge(started.winnie, c1.id).runningSince);
    expect(seen.totalRunningSince).toBe(started.winnie.totalRunningSince);
  });

  it("a timer request for a deleted Winnie's Challenge is refused like another Owner's", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);
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
    const { challenges: [c1] } = await winnieWith(owner, [
      { game: "One" },
    ]);

    const unknown = await api(`/api/challenges/${c1.id}/timer`, {
      as: owner,
      method: "POST",
      json: { action: "pause" },
    });
    expect(unknown.status).toBe(422);
    expect((await unknown.json()).data.fieldErrors).toHaveProperty("action");

    const missing = await api(`/api/challenges/${c1.id}/timer`, { as: owner, method: "POST" });
    expect(missing.status).toBe(422);
  });
});
