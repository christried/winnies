import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

interface ChallengeRow {
  id: string;
  winnieId: string;
  game: string;
  status: string;
  target: number;
  count: number;
}

async function createWinnie(owner: SignedInOwner): Promise<string> {
  const created = await api("/api/winnies", { as: owner, method: "POST", json: { name: "Test Winnie" } });
  expect(created.status).toBe(200);
  return (await created.json()).id;
}

async function createChallenge(owner: SignedInOwner, winnieId: string, body: unknown): Promise<ChallengeRow> {
  const created = await api(`/api/winnies/${winnieId}/challenges`, { as: owner, method: "POST", json: body });
  expect(created.status).toBe(200);
  return created.json();
}

// What the Owner sees on the Winnie: the Challenges in position order.
async function readChallenges(owner: SignedInOwner, winnieId: string): Promise<ChallengeRow[]> {
  const winnie = await api(`/api/winnies/${winnieId}`, { as: owner });
  expect(winnie.status).toBe(200);
  return (await winnie.json()).challenges;
}

function counter(owner: SignedInOwner | undefined, challengeId: string, body: unknown): Promise<Response> {
  return api(`/api/challenges/${challengeId}/counter`, { as: owner, method: "PATCH", json: body });
}

function patchStatus(owner: SignedInOwner | undefined, challengeId: string, status: unknown): Promise<Response> {
  return api(`/api/challenges/${challengeId}`, { as: owner, method: "PATCH", json: { status } });
}

// A Challenge as the Owner sees it on the Winnie, to pin the response and the stored state together.
async function expectState(owner: SignedInOwner, winnieId: string, res: Response, state: { count: number; status: string; target?: number }) {
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject(state);
  expect((await readChallenges(owner, winnieId))[0]).toMatchObject(state);
}

// A 422 names the field and the message in `data.fieldErrors`, and the message is in the body (as JSON text, so quotes are escaped).
async function expectValidationError(res: Response, field: string, message: string) {
  expect(res.status).toBe(422);
  const text = await res.text();
  expect(text).toContain(JSON.stringify(message).slice(1, -1));
  expect(JSON.parse(text).data.fieldErrors[field]).toContain(message);
}

describe("raising the Counter", () => {
  it("raising the Counter to its Target makes the Challenge Won", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: 1 }), { count: 1, status: "todo" });
    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: 1 }), { count: 2, status: "todo" });
    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: 1 }), { count: 3, status: "won" });
  });

  it("setting the Counter to its Target makes the Challenge Won", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "set", count: 3 }), { count: 3, status: "won" });
  });

  it("setting the Counter one below its Target leaves the Challenge todo", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "set", count: 2 }), { count: 2, status: "todo" });
  });

  it("a Counter above its Target stays at the Target", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "set", count: 9 }), { count: 5, status: "won" });
  });

  it("stepping up from the Target stays at the Target", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 2 });
    await counter(owner, challenge.id, { op: "set", count: 2 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: 1 }), { count: 2, status: "won" });
  });
});

describe("lowering the Counter", () => {
  it("stepping down from Won gives todo one below the Target", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });
    await patchStatus(owner, challenge.id, "won");

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: -1 }), { count: 2, status: "todo" });
  });

  it("stepping down from 1 reaches 0, and from 0 stays at 0", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });
    await counter(owner, challenge.id, { op: "set", count: 1 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: -1 }), { count: 0, status: "todo" });
    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: -1 }), { count: 0, status: "todo" });
  });
});

describe("un-winning a Challenge with a Counter", () => {
  it("un-winning a Challenge with a Counter puts the Counter one below its Target", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "won"), { count: 5, status: "won", target: 5 });
    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "todo"), { count: 4, status: "todo", target: 5 });
  });

  it("a Counter with a Target of 1 goes to 0 when un-won", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 1 });

    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "won"), { count: 1, status: "won" });
    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "todo"), { count: 0, status: "todo" });
  });

  // Whatever non-won status is sent, the Challenge is un-won and its status comes from its time
  // (todo with none). The requested string is not stored.
  it("un-winning with the status active stores todo today (Q2)", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });
    await patchStatus(owner, challenge.id, "won");

    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "active"), { count: 4, status: "todo" });
  });

  // Un-winning does not check that the Challenge was Won: it lowers the count of an unwon one as
  // well. Pinned as it is today; whether that is a bug is the human's to decide.
  it("patching todo on an unwon Counter sets its count to Target minus one today (Q3)", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });
    await counter(owner, challenge.id, { op: "set", count: 2 });

    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "todo"), { count: 4, status: "todo" });
  });
});

describe("a Challenge without a Counter", () => {
  it("winning and un-winning a Challenge without a Counter work", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "won"), { count: 0, status: "won", target: 0 });
    await expectState(owner, winnieId, await patchStatus(owner, challenge.id, "todo"), { count: 0, status: "todo", target: 0 });
  });

  it("stepping or setting the Counter of a Challenge without one changes nothing", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "step", delta: 1 }), { count: 0, status: "todo", target: 0 });
    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "set", count: 4 }), { count: 0, status: "todo", target: 0 });
  });
});

describe("changing the Target", () => {
  it("lowering the Target below the count wins the Challenge", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });
    await counter(owner, challenge.id, { op: "set", count: 4 });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "target", target: 3 }), { count: 3, status: "won", target: 3 });
  });

  it("raising the Target of a Won Challenge gives todo", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });
    await patchStatus(owner, challenge.id, "won");

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "target", target: 5 }), { count: 3, status: "todo", target: 5 });
  });

  it("removing the Counter from a Won Challenge gives todo", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });
    await patchStatus(owner, challenge.id, "won");

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "target", target: 0 }), { count: 5, status: "todo", target: 0 });
  });

  it("giving a Challenge without a Counter a Target starts it at 0", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    await expectState(owner, winnieId, await counter(owner, challenge.id, { op: "target", target: 4 }), { count: 0, status: "todo", target: 4 });
  });
});

describe("an invalid Counter request", () => {
  it("set rejects a negative count", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    await expectValidationError(await counter(owner, challenge.id, { op: "set", count: -1 }), "count", "Count cannot be negative");
    await expectValidationError(await counter(owner, challenge.id, { op: "set", count: 1.5 }), "count", "Invalid input: expected int, received number");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ count: 0, status: "todo" });
  });

  it("target rejects a negative value", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    await expectValidationError(await counter(owner, challenge.id, { op: "target", target: -1 }), "target", "Target cannot be negative");
    await expectValidationError(await counter(owner, challenge.id, { op: "target", target: 1.5 }), "target", "Invalid input: expected int, received number");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ target: 5 });
  });

  it("a step other than 1 or -1, an unknown op and a missing op are rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    await expectValidationError(await counter(owner, challenge.id, { op: "step", delta: 2 }), "delta", "Invalid option: expected one of 1|-1");
    await expectValidationError(await counter(owner, challenge.id, { op: "reset" }), "op", "Invalid discriminator value. Expected 'step' | 'target' | 'set'");
    await expectValidationError(await counter(owner, challenge.id, { delta: 1 }), "op", "Invalid discriminator value. Expected 'step' | 'target' | 'set'");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ count: 0, status: "todo" });
  });

  it("a status that is not todo, active or won is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    await expectValidationError(await patchStatus(owner, challenge.id, "done"), "status", "Invalid option: expected one of \"todo\"|\"active\"|\"won\"");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ status: "todo" });
  });
});

describe("the Counter without being allowed", () => {
  it("signed out, PATCH /api/challenges/:id/counter is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });

    const valid = await counter(undefined, challenge.id, { op: "step", delta: 1 });
    expect(valid.status).toBe(401);
    expect(await valid.text()).toContain("not signed in!");

    // 401 comes before the validation
    const invalid = await counter(undefined, challenge.id, { op: "set", count: -1 });
    expect(invalid.status).toBe(401);
    expect(await invalid.text()).toContain("not signed in!");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ count: 0, status: "todo" });
  });

  it("signed out, winning and un-winning a Challenge is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 3 });

    const won = await patchStatus(undefined, challenge.id, "won");
    expect(won.status).toBe(401);
    expect(await won.text()).toContain("not signed in!");
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ count: 0, status: "todo" });

    await patchStatus(owner, challenge.id, "won");
    const unwon = await patchStatus(undefined, challenge.id, "todo");
    expect(unwon.status).toBe(401);
    expect(await unwon.text()).toContain("not signed in!");
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ count: 3, status: "won" });
  });

  it("another Owner cannot win, un-win or count my Challenge", async () => {
    const me = await signInAsOwner();
    const other = await signInAsOwner();
    const winnieId = await createWinnie(me);
    const challenge = await createChallenge(me, winnieId, { game: "Hollow Knight", target: 3 });
    await counter(me, challenge.id, { op: "set", count: 1 });

    // Another Owner's request is checked after its body, so these are valid ones.
    const won = await patchStatus(other, challenge.id, "won");
    expect(won.status).toBe(403);
    expect(await won.text()).toContain("Not your challenge");

    const unwon = await patchStatus(other, challenge.id, "todo");
    expect(unwon.status).toBe(403);
    expect(await unwon.text()).toContain("Not your challenge");

    const stepped = await counter(other, challenge.id, { op: "step", delta: 1 });
    expect(stepped.status).toBe(403);
    expect(await stepped.text()).toContain("Not your Challenge.");

    const set = await counter(other, challenge.id, { op: "set", count: 3 });
    expect(set.status).toBe(403);
    expect(await set.text()).toContain("Not your Challenge.");

    const retargeted = await counter(other, challenge.id, { op: "target", target: 9 });
    expect(retargeted.status).toBe(403);
    expect(await retargeted.text()).toContain("Not your Challenge.");

    expect((await readChallenges(me, winnieId))[0]).toMatchObject({ count: 1, status: "todo", target: 3 });
  });
});
