import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

// A timestamp as JSON carries it: a Date turned into an ISO-8601 string.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// serverNow is the raw text of Postgres's `select now()`, not an ISO string: a space instead of the T,
// microseconds, and the session's UTC offset. Date.parse reads it, which is all a client does with it.
const SERVER_NOW = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}$/;

interface ChallengeRow {
  id: string;
  runningSince: string | null;
}

// Fixtures: these call endpoints owned by other tickets to set state up; no test asserts on them.
async function winnieWith<const T extends readonly { game: string; spec?: string; target?: number }[]>(owner: SignedInOwner, name: string, inputs: T) {
  const created = await api("/api/winnies", {
    as: owner,
    method: "POST",
    json: { name },
  });
  expect(created.status).toBe(200);
  const winnie: { id: string; shareSlug: string } = await created.json();

  const challenges: ChallengeRow[] = [];
  for (const input of inputs) {
    const challenge = await api(`/api/winnies/${winnie.id}/challenges`, { as: owner, method: "POST", json: input });
    expect(challenge.status).toBe(200);
    challenges.push(await challenge.json());
  }
  return { winnie, challenges: challenges as { -readonly [K in keyof T]: ChallengeRow } };
}

function share(slug: string, owner?: SignedInOwner): Promise<Response> {
  return api(`/api/share/${slug}`, { as: owner });
}

async function expectError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expect((await response.json()).statusMessage).toBe(message);
}

describe("reading a Share Link", () => {
  it("a Viewer signed out gets the Winnie and serverNow", async () => {
    const owner = await signInAsOwner();
    const { winnie, challenges: [c1, c2] } = await winnieWith(owner, "Share me", [
      { game: "Game One", spec: "Any%" },
      { game: "Game Two", target: 3 },
    ]);
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
    const { winnie } = await winnieWith(owner, "Same for all", [
      { game: "One" },
    ]);

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
    const { winnie } = await winnieWith(owner, "By slug", [
      { game: "One" },
    ]);

    await expectError(await share(winnie.id), 404, "Winnie doesn't exist.");
  });

  it("a Share Link to a deleted Winnie is not found", async () => {
    const owner = await signInAsOwner();
    const { winnie } = await winnieWith(owner, "Soon gone", [
      { game: "One" },
    ]);
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
