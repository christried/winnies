import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

function saveMotion(reduceMotion: unknown, as?: SignedInOwner) {
  return api("/api/user/motion", {
    as,
    method: "PUT",
    json: { reduceMotion },
  });
}

// The only read path is the session Better Auth hands out. Its cookie cache is on, yet a read right
// after a save shows the new value, so the read-back is not stale today.
async function readMotion(owner: SignedInOwner): Promise<boolean> {
  const session = await (await api("/api/auth/get-session", { as: owner })).json();
  return session.user.reduceMotion;
}

describe("the reduce motion preference", () => {
  it("a new Owner reads false, the column default", async () => {
    const owner = await signInAsOwner();

    expect(await readMotion(owner)).toBe(false);
  });

  it("true and false each save and read back", async () => {
    const owner = await signInAsOwner();

    for (const reduceMotion of [true, false]) {
      const saved = await saveMotion(reduceMotion, owner);

      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ reduceMotion });
      expect(await readMotion(owner)).toBe(reduceMotion);
    }
  });

  it("a value that is not a boolean is a validation error and the preference stays", async () => {
    const owner = await signInAsOwner();
    await saveMotion(true, owner);

    for (const value of ["true", 1, null]) {
      const refused = await saveMotion(value, owner);

      expect(refused.status).toBe(422);
      expect((await refused.json()).data.fieldErrors.reduceMotion).toHaveLength(1);
      expect(await readMotion(owner)).toBe(true);
    }
  });

  it("a body without reduceMotion is a validation error and the preference stays", async () => {
    const owner = await signInAsOwner();
    await saveMotion(true, owner);

    const refused = await api("/api/user/motion", { as: owner, method: "PUT", json: {} });

    expect(refused.status).toBe(422);
    expect((await refused.json()).data.fieldErrors.reduceMotion).toHaveLength(1);
    expect(await readMotion(owner)).toBe(true);
  });

  it("a signed-out save is rejected and no Owner's preference changes", async () => {
    const owner = await signInAsOwner();
    await saveMotion(true, owner);

    const rejected = await saveMotion(false);

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    expect(await readMotion(owner)).toBe(true);
  });

  it("one Owner's preference does not change another's", async () => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    await saveMotion(true, other);

    await saveMotion(false, owner);

    expect(await readMotion(other)).toBe(true);
  });
});
