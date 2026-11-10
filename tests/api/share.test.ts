import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";
import { expectError, ISO, SERVER_NOW, winnieWith } from "./helpers";

function share(slug: string, owner?: SignedInOwner): Promise<Response> {
  return api(`/api/share/${slug}`, { as: owner });
}

describe("reading a Share Link", () => {
  it("a Viewer signed out gets the Winnie and serverNow", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, [
      { game: "Game One", spec: "Any%" },
      { game: "Game Two", target: 3 },
    ], "Share me");
    // A running timer makes a running field visible.
    const started = await api(`/api/challenges/${c1.id}/timer`, {
      as: owner,
      method: "POST",
      json: { action: "start" },
    });
    expect(started.status).toBe(200);

    const response = await share(winnie.shareSlug);

    expect(response.status).toBe(200);
    const text = await response.text();
    const body = JSON.parse(text);
    expect(Object.keys(body).sort()).toEqual(["serverNow", "winnie"]);
    expect(Object.keys(body.winnie).sort()).toEqual([
      "challenges",
      "createdAt",
      "name",
      "totalAccumulatedSeconds",
      "totalRunningSince",
    ]);
    expect(body.winnie).toMatchObject({ name: "Share me", totalAccumulatedSeconds: 0 });
    expect(body.winnie.createdAt).toMatch(ISO);
    expect(body.winnie.totalRunningSince).toMatch(ISO);

    const challengeKeys = [
      "accumulatedSeconds",
      "count",
      "game",
      "id",
      "pinned",
      "position",
      "runningSince",
      "spec",
      "status",
      "target",
    ];
    expect(body.winnie.challenges).toHaveLength(2);
    for (const challenge of body.winnie.challenges)
      expect(Object.keys(challenge).sort()).toEqual(challengeKeys);
    expect(body.winnie.challenges[0]).toMatchObject({
      id: c1.id,
      game: "Game One",
      spec: "Any%",
      status: "active",
      position: 0,
      pinned: false,
      target: 0,
      count: 0,
      accumulatedSeconds: 0,
    });
    expect(body.winnie.challenges[0].runningSince).toMatch(ISO);
    expect(body.winnie.challenges[1]).toMatchObject({
      id: c2.id,
      game: "Game Two",
      spec: "",
      status: "todo",
      position: 1,
      pinned: false,
      target: 3,
      count: 0,
      accumulatedSeconds: 0,
      runningSince: null,
    });

    // serverNow is the database clock that stamped the start, so it is never earlier than it.
    expect(body.serverNow).toMatch(SERVER_NOW);
    expect(Date.parse(body.serverNow)).toBeGreaterThanOrEqual(Date.parse(body.winnie.challenges[0].runningSince));

    // Nothing private reaches a Viewer.
    for (const privateField of ["ownerId", "shareSlug", "playersOn"])
      expect(text).not.toContain(privateField);
  });

  it("a signed-in Owner who is not the Owner gets the same Winnie", async () => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [
      { game: "One" },
    ], "Same for all");

    const signedOut = await share(winnie.shareSlug);
    const signedIn = await share(winnie.shareSlug, other);

    expect(signedOut.status).toBe(200);
    expect(signedIn.status).toBe(200);
    expect((await signedIn.json()).winnie).toEqual((await signedOut.json()).winnie);
  });
});

describe("a Share Link that does not lead to a Winnie", () => {
  it("the share endpoint answers by Share Link, not by Winnie id", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [
      { game: "One" },
    ], "By slug");

    await expectError(await share(winnie.id), 404, "Winnie doesn't exist.");
  });

  it("a Share Link to a deleted Winnie is not found", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, [
      { game: "One" },
    ], "Soon gone");
    expect((await share(winnie.shareSlug)).status).toBe(200);

    const deleted = await api(`/api/winnies/${winnie.id}`, { as: owner, method: "DELETE" });
    expect(deleted.status).toBe(200);

    await expectError(await share(winnie.shareSlug), 404, "Winnie doesn't exist.");
  });

  it("an unknown Share Link is not found", async () => {
    await expectError(await share(crypto.randomUUID()), 404, "Winnie doesn't exist.");
  });

  it("a Share Link that is not a uuid is a validation error", async () => {
    await expectError(await share("not-a-uuid"), 400, "Validation Error");
  });
});
