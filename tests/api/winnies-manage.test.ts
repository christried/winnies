import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

const NOT_SIGNED_IN = "not signed in!";
const NOT_YOUR_WINNIE = "Not your Winnie.";

async function createWinnie(owner: SignedInOwner, name: string): Promise<{ id: string; name: string }> {
  const created = await api("/api/winnies", { as: owner, method: "POST", json: { name } });
  expect(created.status).toBe(200);
  return created.json();
}

async function listed(owner: SignedInOwner): Promise<{ id: string; name: string }[]> {
  return (await api("/api/winnies", { as: owner })).json();
}

function rename(id: string, name: unknown, as?: SignedInOwner) {
  return api(`/api/winnies/${id}`, { as, method: "PATCH", json: { name } });
}

// A 422 from validation: the message text and the field errors, both in the body.
async function expectValidationError(response: Response, field: string, message: string) {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.statusMessage).toContain(message);
  expect(body.data.fieldErrors[field]).toContain(message);
}

// A 403 for a Winnie the caller does not own. It carries no `data` and no part of the Winnie.
async function expectNotYourWinnie(response: Response) {
  expect(response.status).toBe(403);
  const body = await response.json();
  expect(body.statusMessage).toBe(NOT_YOUR_WINNIE);
  expect(body.data).toBeUndefined();
  return JSON.stringify(body);
}

describe("listing Winnies", () => {
  it("an Owner with no Winnies gets an empty list", async () => {
    const owner = await signInAsOwner();

    const response = await api("/api/winnies", { as: owner });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("the list holds only the caller's Winnies, newest first", async () => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    const first = await createWinnie(owner, "First");
    const second = await createWinnie(owner, "Second");
    await createWinnie(other, "Someone else's");

    const winnies = await listed(owner);

    expect(winnies.map(winnie => winnie.id)).toEqual([second.id, first.id]);
  });

  it("a signed-out list is rejected", async () => {
    const owner = await signInAsOwner();
    await createWinnie(owner, "Mine");

    const rejected = await api("/api/winnies");

    expect(rejected.status).toBe(401);
    const text = await rejected.text();
    expect(text).toContain(NOT_SIGNED_IN);
    expect(text).not.toContain("Mine");
  });
});

describe("reading a Winnie", () => {
  it("the Owner reads it with its Challenges", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Mine");

    const response = await api(`/api/winnies/${winnie.id}`, { as: owner });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: winnie.id, name: "Mine", challenges: [] });
  });

  it("a signed-out read is rejected and shows nothing of the Winnie", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Mine");

    const rejected = await api(`/api/winnies/${winnie.id}`);

    expect(rejected.status).toBe(401);
    const text = await rejected.text();
    expect(text).toContain(NOT_SIGNED_IN);
    expect(text).not.toContain("Mine");
  });
});

describe("renaming a Winnie", () => {
  it("renaming works and reads back", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    const renamed = await rename(winnie.id, "Renamed", owner);

    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ id: winnie.id, name: "Renamed", ownerId: owner.user.id });
    expect((await listed(owner)).map(w => w.name)).toEqual(["Renamed"]);
  });

  it("an empty name is a validation error and the name stays", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    await expectValidationError(await rename(winnie.id, "", owner), "name", "Name is required");

    expect((await listed(owner)).map(w => w.name)).toEqual(["Before"]);
  });

  it("a name of only spaces is treated as empty and the name stays", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    await expectValidationError(await rename(winnie.id, "   ", owner), "name", "Name is required");

    expect((await listed(owner)).map(w => w.name)).toEqual(["Before"]);
  });

  it("a name of 31 characters is refused and the name stays", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    await expectValidationError(await rename(winnie.id, "x".repeat(31), owner), "name", "Name is too long");

    expect((await listed(owner)).map(w => w.name)).toEqual(["Before"]);
  });

  it("a name of 30 characters is accepted", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    const renamed = await rename(winnie.id, "x".repeat(30), owner);

    expect(renamed.status).toBe(200);
    expect((await listed(owner)).map(w => w.name)).toEqual(["x".repeat(30)]);
  });

  it("surrounding spaces are trimmed and the trimmed name is stored", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    const renamed = await rename(winnie.id, `  ${"x".repeat(30)}  `, owner);

    expect(renamed.status).toBe(200);
    expect((await listed(owner)).map(w => w.name)).toEqual(["x".repeat(30)]);
  });

  it("a body without a name is a validation error and the name stays", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    const refused = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "PATCH", json: {} });

    expect(refused.status).toBe(422);
    expect((await refused.json()).data.fieldErrors.name).toHaveLength(1);
    expect((await listed(owner)).map(w => w.name)).toEqual(["Before"]);
  });

  it("a signed-out rename is rejected and changes nothing", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Before");

    const rejected = await rename(winnie.id, "Hijacked");

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain(NOT_SIGNED_IN);
    expect((await listed(owner)).map(w => w.name)).toEqual(["Before"]);
  });
});

describe("deleting a Winnie", () => {
  it("deleting works and the Winnie leaves its Owner's list", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Doomed");
    const kept = await createWinnie(owner, "Kept");

    const deleted = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });

    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: winnie.id });
    expect((await listed(owner)).map(w => w.id)).toEqual([kept.id]);
    // Today a deleted Winnie reads as someone else's, not as missing.
    await expectNotYourWinnie(await api(`/api/winnies/${winnie.id}`, { as: owner }));
  });

  it("deleting it again is refused as not-yours", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Doomed");
    await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });

    const again = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });

    await expectNotYourWinnie(again);
  });

  it("a signed-out delete is rejected and changes nothing", async () => {
    const owner = await signInAsOwner();
    const winnie = await createWinnie(owner, "Mine");

    const rejected = await api(`/api/winnies/${winnie.id}`, { method: "DELETE" });

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain(NOT_SIGNED_IN);
    expect((await listed(owner)).map(w => w.id)).toEqual([winnie.id]);
  });
});

describe("another Owner", () => {
  async function ownerAndIntruder() {
    const owner = await signInAsOwner();
    const intruder = await signInAsOwner();
    const winnie = await createWinnie(owner, "Mine");
    return { owner, intruder, winnie };
  }

  it("cannot read the Winnie", async () => {
    const { intruder, winnie } = await ownerAndIntruder();

    const body = await expectNotYourWinnie(await api(`/api/winnies/${winnie.id}`, { as: intruder }));

    expect(body).not.toContain("Mine");
  });

  it("cannot rename the Winnie", async () => {
    const { owner, intruder, winnie } = await ownerAndIntruder();

    await expectNotYourWinnie(await rename(winnie.id, "Hijacked", intruder));

    expect((await listed(owner)).map(w => w.name)).toEqual(["Mine"]);
  });

  it("cannot delete the Winnie", async () => {
    const { owner, intruder, winnie } = await ownerAndIntruder();

    await expectNotYourWinnie(await api(`/api/winnies/${winnie.id}`, { as: intruder, method: "DELETE" }));

    expect((await listed(owner)).map(w => w.id)).toEqual([winnie.id]);
  });

  it("is told about an invalid name before being told the Winnie is not theirs", async () => {
    const { owner, intruder, winnie } = await ownerAndIntruder();

    await expectValidationError(await rename(winnie.id, "", intruder), "name", "Name is required");

    expect((await listed(owner)).map(w => w.name)).toEqual(["Mine"]);
  });

  it("does not see the Winnie in their own list", async () => {
    const { intruder } = await ownerAndIntruder();

    expect(await listed(intruder)).toEqual([]);
  });

  it("gets the same answer for an unknown id as for someone else's Winnie", async () => {
    const intruder = await signInAsOwner();

    await expectNotYourWinnie(await api(`/api/winnies/${crypto.randomUUID()}`, { as: intruder }));
  });
});
