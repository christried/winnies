import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

interface ChallengeRow {
  id: string;
  winnieId: string;
  game: string;
  spec: string;
  status: string;
  pinned: boolean;
  position: number;
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

function patchChallenge(owner: SignedInOwner | undefined, challengeId: string, body: unknown): Promise<Response> {
  return api(`/api/challenges/${challengeId}`, { as: owner, method: "PATCH", json: body });
}

function duplicateChallenge(owner: SignedInOwner | undefined, challengeId: string): Promise<Response> {
  return api(`/api/challenges/${challengeId}/duplicate`, { as: owner, method: "POST" });
}

function deleteChallenge(owner: SignedInOwner | undefined, challengeId: string): Promise<Response> {
  return api(`/api/challenges/${challengeId}`, { as: owner, method: "DELETE" });
}

// A 422 names the field and the message in `data.fieldErrors`, and the message is in the body (as JSON text, so quotes are escaped).
async function expectValidationError(res: Response, field: string, message: string) {
  expect(res.status).toBe(422);
  const text = await res.text();
  expect(text).toContain(JSON.stringify(message).slice(1, -1));
  expect(JSON.parse(text).data.fieldErrors[field]).toContain(message);
}

describe("editing a Challenge", () => {
  it("an Owner edits a Challenge's game and spec", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", spec: "no hits" });

    const gameEdited = await patchChallenge(owner, challenge.id, { game: "Celeste" });
    expect(gameEdited.status).toBe(200);
    expect(await gameEdited.json()).toMatchObject({ id: challenge.id, game: "Celeste", spec: "no hits" });
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "Celeste", spec: "no hits" });

    const specEdited = await patchChallenge(owner, challenge.id, { spec: "all strawberries" });
    expect(specEdited.status).toBe(200);
    expect(await specEdited.json()).toMatchObject({ game: "Celeste", spec: "all strawberries" });
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "Celeste", spec: "all strawberries" });

    const specCleared = await patchChallenge(owner, challenge.id, { spec: "" });
    expect(specCleared.status).toBe(200);
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "Celeste", spec: "" });
  });

  it("an Owner pins and unpins a Challenge", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const pinned = await patchChallenge(owner, challenge.id, { pinned: true });
    expect(pinned.status).toBe(200);
    expect((await pinned.json()).pinned).toBe(true);
    expect((await readChallenges(owner, winnieId))[0]?.pinned).toBe(true);

    const unpinned = await patchChallenge(owner, challenge.id, { pinned: false });
    expect(unpinned.status).toBe(200);
    expect((await unpinned.json()).pinned).toBe(false);
    expect((await readChallenges(owner, winnieId))[0]?.pinned).toBe(false);
  });

  it("a game of 1 and of 30 characters and a spec of 40 characters are accepted", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    expect((await patchChallenge(owner, challenge.id, { game: "a" })).status).toBe(200);
    expect((await patchChallenge(owner, challenge.id, { game: "a".repeat(30) })).status).toBe(200);
    expect((await patchChallenge(owner, challenge.id, { spec: "b".repeat(40) })).status).toBe(200);

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "a".repeat(30), spec: "b".repeat(40) });
  });

  it("an edit with an invalid game or spec is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", spec: "no hits" });

    await expectValidationError(await patchChallenge(owner, challenge.id, { game: "" }), "game", "Game is required");
    await expectValidationError(await patchChallenge(owner, challenge.id, { game: "a".repeat(31) }), "game", "Game is too long");
    await expectValidationError(await patchChallenge(owner, challenge.id, { spec: "a".repeat(41) }), "spec", "Spec is too long");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "Hollow Knight", spec: "no hits" });
  });

  it("an edit with nothing to update is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    const empty = await patchChallenge(owner, challenge.id, {});
    expect(empty.status).toBe(422);
    expect(await empty.text()).toContain("Nothing to update");

    // The Target is not editable here; it is a Counter operation.
    const target = await patchChallenge(owner, challenge.id, { target: 3 });
    expect(target.status).toBe(422);
    expect(await target.text()).toContain("Nothing to update");

    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ target: 5 });
  });

  it("a whitespace-only game is accepted today", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const edited = await patchChallenge(owner, challenge.id, { game: "   " });

    expect(edited.status).toBe(200);
    expect((await readChallenges(owner, winnieId))[0]?.game).toBe("   ");
  });

  it("a status sent with other fields changes only the status today (Q9)", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", spec: "no hits" });

    const edited = await patchChallenge(owner, challenge.id, { status: "won", game: "Celeste", pinned: true });

    expect(edited.status).toBe(200);
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ status: "won", game: "Hollow Knight", pinned: false });
  });
});

describe("duplicating a Challenge", () => {
  it("an Owner duplicates a Challenge", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const first = await createChallenge(owner, winnieId, { game: "First" });
    const middle = await createChallenge(owner, winnieId, { game: "Middle", spec: "no hits", target: 5 });
    const last = await createChallenge(owner, winnieId, { game: "Last" });

    const duplicated = await duplicateChallenge(owner, middle.id);

    expect(duplicated.status).toBe(200);
    const copy: ChallengeRow = await duplicated.json();
    expect(copy.id).not.toBe(middle.id);
    expect(copy).toMatchObject({
      winnieId,
      game: "Middle",
      spec: "no hits",
      target: 5,
      position: 2,
      status: "todo",
      count: 0,
      pinned: false,
    });

    // The copy sits right after the original; what came after it moved up by one.
    const challenges = await readChallenges(owner, winnieId);
    expect(challenges.map(c => [c.id, c.position])).toEqual([
      [first.id, 0],
      [middle.id, 1],
      [copy.id, 2],
      [last.id, 3],
    ]);
  });

  it("duplicating the first and the last Challenge puts the copy right after it", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const first = await createChallenge(owner, winnieId, { game: "First" });
    const last = await createChallenge(owner, winnieId, { game: "Last" });

    const copyOfFirst: ChallengeRow = await (await duplicateChallenge(owner, first.id)).json();
    const copyOfLast: ChallengeRow = await (await duplicateChallenge(owner, last.id)).json();

    const challenges = await readChallenges(owner, winnieId);
    expect(challenges.map(c => [c.id, c.position])).toEqual([
      [first.id, 0],
      [copyOfFirst.id, 1],
      [last.id, 2],
      [copyOfLast.id, 3],
    ]);
  });

  it("duplicating a Counter keeps the Target and resets the count", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });
    const counted = await api(`/api/challenges/${challenge.id}/counter`, { as: owner, method: "PATCH", json: { op: "set", count: 2 } });
    expect(counted.status).toBe(200);

    const duplicated = await duplicateChallenge(owner, challenge.id);

    expect(duplicated.status).toBe(200);
    expect(await duplicated.json()).toMatchObject({ target: 5, count: 0 });
    const challenges = await readChallenges(owner, winnieId);
    expect(challenges.map(c => [c.target, c.count])).toEqual([[5, 2], [5, 0]]);
  });

  it("duplicating a Won Challenge gives a todo copy", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });
    const won = await patchChallenge(owner, challenge.id, { status: "won" });
    expect(won.status).toBe(200);

    const duplicated = await duplicateChallenge(owner, challenge.id);

    expect(duplicated.status).toBe(200);
    expect(await duplicated.json()).toMatchObject({ status: "todo" });
    expect((await readChallenges(owner, winnieId)).map(c => c.status)).toEqual(["won", "todo"]);
  });

  it("duplicating a pinned Challenge gives an unpinned copy", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });
    expect((await patchChallenge(owner, challenge.id, { pinned: true })).status).toBe(200);

    const duplicated = await duplicateChallenge(owner, challenge.id);

    expect(duplicated.status).toBe(200);
    expect((await readChallenges(owner, winnieId)).map(c => c.pinned)).toEqual([true, false]);
  });

  // Only adding checks the limit of 50 (challenges.test.ts); duplicating does not. Pinned as it
  // is today; whether that is wanted is the human's to decide.
  it("duplicate of the 50th Challenge is not refused today (Q1)", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    let last: ChallengeRow | undefined;
    for (let position = 0; position < 50; position++) {
      last = await createChallenge(owner, winnieId, { game: `Game ${position}` });
    }

    const duplicated = await duplicateChallenge(owner, last!.id);

    expect(duplicated.status).toBe(200);
    expect(await readChallenges(owner, winnieId)).toHaveLength(51);
  }, 60_000);
});

describe("deleting a Challenge", () => {
  it("an Owner deletes a Challenge", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const first = await createChallenge(owner, winnieId, { game: "First" });
    const second = await createChallenge(owner, winnieId, { game: "Second" });

    const deleted = await deleteChallenge(owner, first.id);

    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: first.id, complete: false });
    expect((await readChallenges(owner, winnieId)).map(c => c.id)).toEqual([second.id]);
  });

  it("deleting the only Challenge reports not complete", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const deleted = await deleteChallenge(owner, challenge.id);

    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: challenge.id, complete: false });
    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });

  it("deleting a Challenge again is refused", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });
    expect((await deleteChallenge(owner, challenge.id)).status).toBe(200);

    // A Challenge that is gone reads as one that is not theirs.
    const again = await deleteChallenge(owner, challenge.id);

    expect(again.status).toBe(403);
    expect(await again.text()).toContain("Not your Challenge.");
  });
});

describe("editing, duplicating and deleting without being allowed", () => {
  it("signed out, PATCH /api/challenges/:id is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const valid = await patchChallenge(undefined, challenge.id, { game: "Celeste" });
    expect(valid.status).toBe(401);
    expect(await valid.text()).toContain("not signed in!");

    // 401 comes before the validation
    const invalid = await patchChallenge(undefined, challenge.id, { game: "" });
    expect(invalid.status).toBe(401);
    expect(await invalid.text()).toContain("not signed in!");

    expect((await readChallenges(owner, winnieId))[0]?.game).toBe("Hollow Knight");
  });

  it("signed out, DELETE /api/challenges/:id is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const rejected = await deleteChallenge(undefined, challenge.id);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    expect((await readChallenges(owner, winnieId)).map(c => c.id)).toEqual([challenge.id]);
  });

  it("signed out, POST /api/challenges/:id/duplicate is rejected", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const challenge = await createChallenge(owner, winnieId, { game: "Hollow Knight" });

    const rejected = await duplicateChallenge(undefined, challenge.id);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    expect((await readChallenges(owner, winnieId)).map(c => c.id)).toEqual([challenge.id]);
  });

  it("another Owner cannot edit my Challenge", async () => {
    const me = await signInAsOwner();
    const other = await signInAsOwner();
    const winnieId = await createWinnie(me);
    const challenge = await createChallenge(me, winnieId, { game: "Hollow Knight" });

    const rejected = await patchChallenge(other, challenge.id, { game: "Celeste" });

    expect(rejected.status).toBe(403);
    // Lowercase and without a full stop, unlike the other Challenge routes.
    expect(await rejected.text()).toContain("Not your challenge");
    expect((await readChallenges(me, winnieId))[0]?.game).toBe("Hollow Knight");
  });

  it("another Owner cannot delete my Challenge", async () => {
    const me = await signInAsOwner();
    const other = await signInAsOwner();
    const winnieId = await createWinnie(me);
    const challenge = await createChallenge(me, winnieId, { game: "Hollow Knight" });

    const rejected = await deleteChallenge(other, challenge.id);

    expect(rejected.status).toBe(403);
    expect(await rejected.text()).toContain("Not your Challenge.");
    expect((await readChallenges(me, winnieId)).map(c => c.id)).toEqual([challenge.id]);
  });

  it("another Owner cannot duplicate my Challenge", async () => {
    const me = await signInAsOwner();
    const other = await signInAsOwner();
    const winnieId = await createWinnie(me);
    const challenge = await createChallenge(me, winnieId, { game: "Hollow Knight" });

    const rejected = await duplicateChallenge(other, challenge.id);

    expect(rejected.status).toBe(403);
    expect(await rejected.text()).toContain("Not your Challenge.");
    expect((await readChallenges(me, winnieId)).map(c => c.id)).toEqual([challenge.id]);
  });
});
