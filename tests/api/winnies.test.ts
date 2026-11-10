import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const QUOTA_MESSAGE = "You can create 10 Winnies per day. Try again tomorrow.";

function createWinnie(owner: SignedInOwner, body: unknown) {
  return api("/api/winnies", { as: owner, method: "POST", json: body });
}

async function listedIds(owner: SignedInOwner): Promise<string[]> {
  const listed = await (await api("/api/winnies", { as: owner })).json();
  return listed.map((winnie: { id: string }) => winnie.id);
}

// A 422 from validation: the status, the message text in the body, and the field errors under `data`.
// The Nitro error body carries `data` intact, so a field's message can be asserted by name.
async function expectValidationError(response: Response, field: string, message: string) {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.statusMessage).toContain(message);
  expect(body.data.fieldErrors[field]).toContain(message);
}

describe("creating a Winnie", () => {
  it("a signed-in Owner creates a Winnie", async () => {
    const owner = await signInAsOwner();

    const created = await api("/api/winnies", {
      as: owner,
      method: "POST",
      json: { name: "First Winnie" },
    });

    expect(created.status).toBe(200);
    const winnie = await created.json();
    expect(winnie).toMatchObject({
      name: "First Winnie",
      ownerId: owner.user.id,
      totalAccumulatedSeconds: 0,
      totalRunningSince: null,
    });
    expect(winnie.id).toMatch(UUID);
    expect(winnie.shareSlug).toMatch(UUID);

    // Seen through the API: the database held the row.
    const listed = await (await api("/api/winnies", { as: owner })).json();
    expect(listed.map((w: { id: string }) => w.id)).toEqual([winnie.id]);
  });

  it("the same request signed out is rejected", async () => {
    const owner = await signInAsOwner();

    const rejected = await api("/api/winnies", {
      method: "POST",
      json: { name: "First Winnie" },
    });

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");

    const listed = await (await api("/api/winnies", { as: owner })).json();
    expect(listed).toEqual([]);
  });

  it("a new Winnie starts with playersOn off and both timestamps set", async () => {
    const owner = await signInAsOwner();

    const winnie = await (await createWinnie(owner, { name: "Fresh" })).json();

    expect(winnie.playersOn).toBe(false);
    expect(Number.isNaN(Date.parse(winnie.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(winnie.updatedAt))).toBe(false);
  });

  it("an empty name is a validation error and creates nothing", async () => {
    const owner = await signInAsOwner();

    await expectValidationError(await createWinnie(owner, { name: "" }), "name", "Name is required");

    expect(await listedIds(owner)).toEqual([]);
  });

  it("a name of only spaces is treated as empty", async () => {
    const owner = await signInAsOwner();

    await expectValidationError(await createWinnie(owner, { name: "   " }), "name", "Name is required");

    expect(await listedIds(owner)).toEqual([]);
  });

  it("a body without a name is a validation error", async () => {
    const owner = await signInAsOwner();

    const refused = await createWinnie(owner, {});

    expect(refused.status).toBe(422);
    const body = await refused.json();
    expect(body.data.fieldErrors.name).toHaveLength(1);
    expect(await listedIds(owner)).toEqual([]);
  });

  it("a name of 31 characters is refused", async () => {
    const owner = await signInAsOwner();

    await expectValidationError(await createWinnie(owner, {
      name: "x".repeat(31),
    }), "name", "Name is too long");

    expect(await listedIds(owner)).toEqual([]);
  });

  it("a name of 30 characters is accepted", async () => {
    const owner = await signInAsOwner();

    const created = await createWinnie(owner, {
      name: "x".repeat(30),
    });

    expect(created.status).toBe(200);
    expect((await created.json()).name).toBe("x".repeat(30));
  });

  it("a name of one character is accepted", async () => {
    const owner = await signInAsOwner();

    const created = await createWinnie(owner, { name: "x" });

    expect(created.status).toBe(200);
    expect((await created.json()).name).toBe("x");
  });

  it("surrounding spaces are trimmed before the limit is checked, and the trimmed name is stored", async () => {
    const owner = await signInAsOwner();

    const created = await createWinnie(owner, { name: `  ${"x".repeat(30)}  ` });

    expect(created.status).toBe(200);
    expect((await created.json()).name).toBe("x".repeat(30));
    const listed = await (await api("/api/winnies", { as: owner })).json();
    expect(listed[0].name).toBe("x".repeat(30));
  });

  it("an ownerId in the body is ignored", async () => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();

    const created = await createWinnie(owner, { name: "Mine", ownerId: other.user.id });

    expect(created.status).toBe(200);
    expect((await created.json()).ownerId).toBe(owner.user.id);
    expect(await listedIds(other)).toEqual([]);
  });
});

describe("the Quota", () => {
  async function createTen(owner: SignedInOwner): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const created = await createWinnie(owner, { name: `Winnie ${i}` });
      expect(created.status).toBe(200);
      ids.push((await created.json()).id);
    }
    return ids;
  }

  it("the 11th Winnie inside 24 hours is refused with 429", async () => {
    const owner = await signInAsOwner();
    await createTen(owner);

    const refused = await createWinnie(owner, { name: "One too many" });

    expect(refused.status).toBe(429);
    const body = await refused.json();
    expect(body.statusMessage).toBe(QUOTA_MESSAGE);
    expect(body.data.message).toBe(QUOTA_MESSAGE);
    expect(await listedIds(owner)).toHaveLength(10);
  });

  it("at the limit, an invalid name is a 422, not a 429", async () => {
    const owner = await signInAsOwner();
    await createTen(owner);

    const refused = await createWinnie(owner, { name: "" });

    await expectValidationError(refused, "name", "Name is required");
  });

  it("the Quota is per Owner: another Owner can still create at the limit", async () => {
    const atLimit = await signInAsOwner();
    const other = await signInAsOwner();
    await createTen(atLimit);

    const created = await createWinnie(other, { name: "Mine" });

    expect(created.status).toBe(200);
  });

  // Pins today's counting: the Quota counts the Owner's existing Winnies created in the last day,
  // so a delete gives a creation back. The glossary describes the decided behaviour (creations are
  // counted, deleting gives nothing back); a later ticket builds it and updates this test.
  it("deleting one Winnie gives a creation back", async () => {
    const owner = await signInAsOwner();
    const ids = await createTen(owner);
    expect((await createWinnie(owner, { name: "Eleventh" })).status).toBe(429);

    const deleted = await api(`/api/winnies/${ids[0]}`, { as: owner, method: "DELETE" });
    expect(deleted.status).toBe(200);

    expect((await createWinnie(owner, { name: "Eleventh, again" })).status).toBe(200);
    const refused = await createWinnie(owner, { name: "Twelfth" });
    expect(refused.status).toBe(429);
    expect((await refused.json()).statusMessage).toBe(QUOTA_MESSAGE);
    expect(await listedIds(owner)).toHaveLength(10);
  });
});
