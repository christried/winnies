import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

describe("signing in as an Owner", () => {
  it("two signed-in Owners do not collide", async () => {
    const [first, second] = await Promise.all([
      signInAsOwner(),
      signInAsOwner(),
    ]);

    expect(first.user.id).not.toBe(second.user.id);
    expect(first.user.email).not.toBe(second.user.email);

    const [firstWinnie, secondWinnie] = await Promise.all([
      api("/api/winnies", {
        as: first,
        method: "POST",
        json: { name: "First Owner's Winnie" },
      }).then(response => response.json()),
      api("/api/winnies", {
        as: second,
        method: "POST",
        json: { name: "Second Owner's Winnie" },
      }).then(response => response.json()),
    ]);

    const firstList = await (await api("/api/winnies", { as: first })).json();
    const secondList = await (await api("/api/winnies", { as: second })).json();
    expect(firstList.map((winnie: { id: string }) => winnie.id)).toEqual([firstWinnie.id]);
    expect(secondList.map((winnie: { id: string }) => winnie.id)).toEqual([secondWinnie.id]);
  });
});
