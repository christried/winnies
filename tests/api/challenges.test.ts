import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { createChallenge, createWinnie, expectValidationError, postChallenge, readChallenges } from "./helpers";

describe("adding a Challenge", () => {
  it("an Owner adds a Challenge with only a game", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);
    expect(await readChallenges(owner, winnieId)).toEqual([]);

    const added = await postChallenge(owner, winnieId, { game: "Hollow Knight" });

    expect(added.status).toBe(200);
    const challenge = await added.json();
    expect(challenge).toMatchObject({
      winnieId,
      game: "Hollow Knight",
      spec: "",
      target: 0,
      count: 0,
      status: "todo",
      pinned: false,
      position: 0,
      accumulatedSeconds: 0,
      runningSince: null,
    });

    const challenges = await readChallenges(owner, winnieId);
    expect(challenges.map(c => c.id)).toEqual([challenge.id]);
  });

  it("an Owner adds a Challenge with a Win Condition", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const added = await postChallenge(owner, winnieId, { game: "Hollow Knight", spec: "no hits" });

    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ game: "Hollow Knight", spec: "no hits", target: 0 });
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ game: "Hollow Knight", spec: "no hits" });
  });

  it("an Owner adds a Challenge with a Counter", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const added = await postChallenge(owner, winnieId, { game: "Hollow Knight", target: 5 });

    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ target: 5, count: 0, status: "todo" });
    expect((await readChallenges(owner, winnieId))[0]).toMatchObject({ target: 5, count: 0, status: "todo" });
  });

  it("a second Challenge goes to the next position", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const first = await createChallenge(owner, winnieId, { game: "First" });
    const second = await createChallenge(owner, winnieId, { game: "Second" });

    expect([first.position, second.position]).toEqual([0, 1]);
    const challenges = await readChallenges(owner, winnieId);
    expect(challenges.map(c => [c.id, c.position])).toEqual([
      [first.id, 0],
      [second.id, 1],
    ]);
  });

  it("an invalid game is rejected", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    await expectValidationError(await postChallenge(owner, winnieId, { game: "" }), "game", "Game is required");
    await expectValidationError(await postChallenge(owner, winnieId, {
      game: "a".repeat(31),
    }), "game", "Game is too long");
    await expectValidationError(await postChallenge(owner, winnieId, {}), "game", "Invalid input: expected string, received undefined");

    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });

  it("a game of 1 and of 30 characters is accepted", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    expect((await postChallenge(owner, winnieId, { game: "a" })).status).toBe(200);
    expect((await postChallenge(owner, winnieId, {
      game: "a".repeat(30),
    })).status).toBe(200);
    expect(await readChallenges(owner, winnieId)).toHaveLength(2);
  });

  it("a whitespace-only game is accepted today", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const added = await postChallenge(owner, winnieId, { game: "   " });

    expect(added.status).toBe(200);
    expect((await readChallenges(owner, winnieId))[0]?.game).toBe("   ");
  });

  it("an invalid spec is rejected", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    await expectValidationError(await postChallenge(owner, winnieId, {
      game: "Hollow Knight",
      spec: "a".repeat(41),
    }), "spec", "Spec is too long");

    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });

  it("a spec of 0 and of 40 characters is accepted", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    expect((await postChallenge(owner, winnieId, { game: "Hollow Knight", spec: "" })).status).toBe(200);
    expect((await postChallenge(owner, winnieId, {
      game: "Hollow Knight",
      spec: "a".repeat(40),
    })).status).toBe(200);
    expect(await readChallenges(owner, winnieId)).toHaveLength(2);
  });

  it("an invalid Target is rejected", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    await expectValidationError(await postChallenge(owner, winnieId, { game: "Hollow Knight", target: -1 }), "target", "Target cannot be negative");
    await expectValidationError(await postChallenge(owner, winnieId, { game: "Hollow Knight", target: 1.5 }), "target", "Invalid input: expected int, received number");

    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });

  it("a Target of 1 is the smallest Counter", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const added = await postChallenge(owner, winnieId, { game: "Hollow Knight", target: 1 });

    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ target: 1, count: 0, status: "todo" });
  });

  it("a Target beyond the 32-bit integer range is rejected today", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const added = await postChallenge(owner, winnieId, { game: "Hollow Knight", target: 2147483648 });

    await expectValidationError(added, "target", "Too big: expected number to be <=2147483647");
    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });
});

describe("the limit of Challenges on one Winnie", () => {
  // 50 sequential POSTs (parallel ones could race on the position) plus the 51st; the global
  // timeout of 15 s is too short for them.
  it("the 51st Challenge on one Winnie is refused", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    for (let position = 0; position < 50; position++) {
      const added = await postChallenge(owner, winnieId, { game: `Game ${position}` });
      expect(added.status).toBe(200);
      expect((await added.json()).position).toBe(position);
    }

    const refused = await postChallenge(owner, winnieId, { game: "One too many" });

    expect(refused.status).toBe(429);
    expect(await refused.text()).toContain("A Winnie can hold 50 Challenges.");
    expect(await readChallenges(owner, winnieId)).toHaveLength(50);
  }, 60_000);
});

describe("adding a Challenge without being allowed", () => {
  it("signed out, POST /api/winnies/:id/challenges is rejected", async () => {
    const owner = await signInAsOwner();
    const { id: winnieId } = await createWinnie(owner);

    const valid = await postChallenge(undefined, winnieId, { game: "Hollow Knight" });
    expect(valid.status).toBe(401);
    expect(await valid.text()).toContain("not signed in!");

    // 401 comes before the validation
    const invalid = await postChallenge(undefined, winnieId, { game: "" });
    expect(invalid.status).toBe(401);
    expect(await invalid.text()).toContain("not signed in!");

    expect(await readChallenges(owner, winnieId)).toEqual([]);
  });

  it("another Owner cannot add a Challenge to my Winnie", async () => {
    const me = await signInAsOwner();
    const other = await signInAsOwner();
    const { id: winnieId } = await createWinnie(me);

    const rejected = await postChallenge(other, winnieId, { game: "Hollow Knight" });

    expect(rejected.status).toBe(403);
    expect(await rejected.text()).toContain("Not your Winnie. You cannot create a Challenge here.");
    expect(await readChallenges(me, winnieId)).toEqual([]);
  });
});
