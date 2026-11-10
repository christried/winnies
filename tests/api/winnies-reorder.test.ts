import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

const NOT_SIGNED_IN = "not signed in!";
const MISMATCH = "Order must list every challenge exactly once";

async function createWinnie(owner: SignedInOwner, name = "A Winnie"): Promise<string> {
  const created = await api("/api/winnies", { as: owner, method: "POST", json: { name } });
  expect(created.status).toBe(200);
  return (await created.json()).id;
}

// Challenges are set up through the API and read back in the order they were made. #198 pins that endpoint.
async function createChallenges(owner: SignedInOwner, winnieId: string, games: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const game of games) {
    const created = await api(`/api/winnies/${winnieId}/challenges`, { as: owner, method: "POST", json: { game } });
    expect(created.status).toBe(200);
    ids.push((await created.json()).id);
  }
  return ids;
}

// A Winnie with its Challenges, so a test can read the stored order.
async function challengeOrder(owner: SignedInOwner, winnieId: string): Promise<string[]> {
  const winnie = await (await api(`/api/winnies/${winnieId}`, { as: owner })).json();
  return winnie.challenges.map((challenge: { id: string }) => challenge.id);
}

function reorder(winnieId: string, ids: unknown, as?: SignedInOwner) {
  return api(`/api/winnies/${winnieId}/reorder`, { as, method: "POST", json: { ids } });
}

// The mismatch is thrown inside the query, not by validation: a 422 with the message and no `data`.
async function expectMismatch(response: Response) {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.statusMessage).toBe(MISMATCH);
  expect(body.data).toBeUndefined();
}

// A 422 from validation: the message text and the field errors, both in the body.
async function expectValidationError(response: Response, field: string, message: string) {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.statusMessage).toContain(message);
  expect(body.data.fieldErrors[field]).toContain(message);
}

describe("reordering a Winnie's Challenges", () => {
  async function winnieWithThree() {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const [a, b, c] = await createChallenges(owner, winnieId, ["a", "b", "c"]);
    return { owner, winnieId, a: a!, b: b!, c: c! };
  }

  it("persists the new order", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();
    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);

    const reordered = await reorder(winnieId, [c, b, a], owner);

    // The handler returns nothing, and the server answers 204 with an empty body.
    expect(reordered.status).toBe(204);
    expect(await reordered.text()).toBe("");
    expect(await challengeOrder(owner, winnieId)).toEqual([c, b, a]);
  });

  it("a Winnie with one Challenge reorders to itself", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const [only] = await createChallenges(owner, winnieId, ["only"]);

    const reordered = await reorder(winnieId, [only], owner);

    expect(reordered.status).toBe(204);
    expect(await challengeOrder(owner, winnieId)).toEqual([only]);
  });

  it("a list missing one Challenge is refused and the order stays", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    await expectMismatch(await reorder(winnieId, [c, b], owner));

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("a list with an unknown id is refused and the order stays", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    await expectMismatch(await reorder(winnieId, [c, b, crypto.randomUUID()], owner));

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("a list with a Challenge of another Winnie is refused as a mismatch, not as not-yours", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();
    const secondWinnie = await createWinnie(owner, "Second");
    const [foreign] = await createChallenges(owner, secondWinnie, ["foreign"]);

    await expectMismatch(await reorder(winnieId, [c, b, foreign], owner));

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
    expect(await challengeOrder(owner, secondWinnie)).toEqual([foreign]);
  });

  it("a list with the same id twice is a validation error", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    await expectValidationError(await reorder(winnieId, [a, a, b], owner), "ids", "The same challenge appears twice");

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("an empty list is a validation error", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    await expectValidationError(await reorder(winnieId, [], owner), "ids", "Nothing to reorder");

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("an id that is not a uuid is a validation error", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    await expectValidationError(await reorder(winnieId, ["nope", b, c], owner), "ids", "Not a valid id");

    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("a body without ids is a validation error", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    const refused = await api(`/api/winnies/${winnieId}/reorder`, { as: owner, method: "POST", json: {} });

    expect(refused.status).toBe(422);
    expect((await refused.json()).data.fieldErrors.ids).toHaveLength(1);
    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("a Winnie with no Challenges refuses any list as a mismatch", async () => {
    const owner = await signInAsOwner();
    const winnieId = await createWinnie(owner);

    await expectMismatch(await reorder(winnieId, [crypto.randomUUID()], owner));
  });

  it("a signed-out reorder is rejected and the order stays", async () => {
    const { owner, winnieId, a, b, c } = await winnieWithThree();

    const rejected = await reorder(winnieId, [c, b, a]);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain(NOT_SIGNED_IN);
    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("a signed-out reorder with an invalid body is still a 401", async () => {
    const { winnieId } = await winnieWithThree();

    const rejected = await reorder(winnieId, []);

    expect(rejected.status).toBe(401);
  });
});

describe("another Owner reordering", () => {
  it("is refused as not-yours and the order stays", async () => {
    const owner = await signInAsOwner();
    const intruder = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    const [a, b, c] = await createChallenges(owner, winnieId, ["a", "b", "c"]);

    const refused = await reorder(winnieId, [c, b, a], intruder);

    expect(refused.status).toBe(403);
    const body = await refused.json();
    expect(body.statusMessage).toBe("Not your Winnie.");
    expect(body.data).toBeUndefined();
    expect(await challengeOrder(owner, winnieId)).toEqual([a, b, c]);
  });

  it("is told about an invalid list before being told the Winnie is not theirs", async () => {
    const owner = await signInAsOwner();
    const intruder = await signInAsOwner();
    const winnieId = await createWinnie(owner);
    await createChallenges(owner, winnieId, ["a"]);

    await expectValidationError(await reorder(winnieId, [], intruder), "ids", "Nothing to reorder");
  });
});
