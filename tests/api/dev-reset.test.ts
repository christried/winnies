import type { SignedInOwner } from "../support/owner";
import type { WinnieRow } from "../support/rows";
import { describe, expect, it, vi } from "vitest";
import { DUMMY_WINNIES } from "../../server/dev/dummy-winnies";
import { resetDummyWinnies } from "../../server/dev/reset-dummy-winnies";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";
import { readWinnie, winnieWith } from "./helpers";

// The reset behind `/api/dev/sign-in?seed=reset` (#236) deletes by `ownerId` and nothing else, and the staging
// rule of delivery.md (agents may change only a dev Owner's data) depends on that. The test server blanks
// WINNIES_STAGE, so the route is not there to call; the reset itself runs here, against the test database,
// and every Owner is read back through the API. The app's server/db reads DATABASE_URL, which no test process
// holds, so the reset gets the test database in its place (tests/support/db.ts).
vi.mock("../../server/db", async () => {
  const { createTestDb } = await import("../support/db");
  return { db: createTestDb().db };
});

const HOUR_MS = 3_600_000;
// A moment far from the real one, so the dates the reset writes can only have come from the `now` it was given.
const NOW = Date.parse("2031-05-17T12:00:00.000Z");

async function readAll(owner: SignedInOwner): Promise<WinnieRow[]> {
  const listed: { id: string }[] = await (await api("/api/winnies", { as: owner })).json();
  return Promise.all(listed.map(({ id }) => readWinnie(owner, id)));
}

describe("resetting a dev Owner's Winnies", () => {
  it("replaces that Owner's Winnies with the dummy set and leaves another Owner's Winnies and Challenges as they were", async () => {
    const devOwner = await signInAsOwner();
    const other = await signInAsOwner();
    await winnieWith(devOwner, [
      { game: "Old Game" },
    ], "Old Winnie");
    await winnieWith(other, [
      { game: "Portal 2", spec: "No deaths" },
      { game: "Celeste", target: 5 },
    ], "Other One");
    await winnieWith(other, [
      { game: "Hades" },
    ], "Other Two");
    const before = await readAll(other);
    expect(before.map(w => w.challenges.length).sort()).toEqual([1, 2]);

    await resetDummyWinnies(devOwner.user.id, NOW);

    const reset = await readAll(devOwner);
    expect(reset.map(w => w.name).sort()).toEqual(DUMMY_WINNIES.map(w => w.name).sort());
    expect(reset.map(w => w.challenges.length).sort()).toEqual(DUMMY_WINNIES.map(w => w.challenges.length).sort());
    // The dummy set's offsets count back from the `now` the reset was given.
    const first = reset.find(w => w.name === DUMMY_WINNIES[0]!.name)!;
    expect(first.createdAt).toBe(new Date(NOW - DUMMY_WINNIES[0]!.createdHoursAgo * HOUR_MS).toISOString());
    expect(await readAll(other)).toEqual(before);
  });

  it("replaces the dummy set again instead of adding to it, with new ids, and still leaves the other Owner alone", async () => {
    const devOwner = await signInAsOwner();
    const other = await signInAsOwner();
    await winnieWith(other, [
      { game: "Spelunky" },
    ], "Other Winnie");
    const before = await readAll(other);

    await resetDummyWinnies(devOwner.user.id, NOW);
    const first = await readAll(devOwner);
    await resetDummyWinnies(devOwner.user.id, NOW);
    const second = await readAll(devOwner);

    expect(second).toHaveLength(DUMMY_WINNIES.length);
    expect(second.map(w => w.id).filter(id => first.some(w => w.id === id))).toEqual([]);
    expect(await readAll(other)).toEqual(before);
  });
});
