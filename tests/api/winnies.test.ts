import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("creating a Winnie", () => {
  it("a signed-in Owner creates a Winnie", async () => {
    const owner = await signInAsOwner();

    const created = await api("/api/winnies", { as: owner, method: "POST", json: { name: "First Winnie" } });

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

    const rejected = await api("/api/winnies", { method: "POST", json: { name: "First Winnie" } });

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");

    const listed = await (await api("/api/winnies", { as: owner })).json();
    expect(listed).toEqual([]);
  });
});
