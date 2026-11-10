import type { SignedInOwner } from "../support/owner";
import type { ChallengeRow, TimerResponse, WinnieRow } from "../support/rows";
import { expect } from "vitest";
import { api } from "./api";

// A timestamp as JSON carries it: a Date turned into an ISO-8601 string.
export const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// serverNow is the raw text of Postgres's `select now()`, not an ISO string: a space instead of the T,
// microseconds, and the session's UTC offset. Date.parse reads it, which is all a client does with it.
export const SERVER_NOW = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}$/;

// The one wait every sleeping case makes. A timer started before it and stopped after it has run at
// least this long, however loaded the machine is, so the lower bounds below come from this and
// never from the server.
export const MIN_RUN_MS = 2500;

export const NOT_SIGNED_IN = "not signed in!";

// Fixtures: these call endpoints owned by other tickets to set state up. The helpers that read back
// assert the status of each request they make, so a broken setup fails where it happens.

/**
 * The raw request that creates a Winnie, for the tests that pin its answer.
 *
 * @param owner the Owner who creates it
 * @param body what to send, as is
 * @returns the raw response
 */
export function postWinnie(owner: SignedInOwner, body: unknown): Promise<Response> {
  return api("/api/winnies", { as: owner, method: "POST", json: body });
}

/**
 * Creates a Winnie and checks that it was created.
 *
 * @param owner the Owner who creates it
 * @param name the Winnie's name
 * @returns the created row (the Challenges come with a read, not with the creation)
 */
export async function createWinnie(owner: SignedInOwner, name = "Test Winnie"): Promise<Omit<WinnieRow, "challenges">> {
  const created = await postWinnie(owner, { name });
  expect(created.status).toBe(200);
  return created.json();
}

/**
 * The raw request that adds a Challenge, for the tests that pin its answer.
 *
 * @param owner the Owner who adds it, or nobody
 * @param winnieId the Winnie to add it to
 * @param body what to send, as is
 * @returns the raw response
 */
export function postChallenge(owner: SignedInOwner | undefined, winnieId: string, body: unknown): Promise<Response> {
  return api(`/api/winnies/${winnieId}/challenges`, { as: owner, method: "POST", json: body });
}

/**
 * Adds a Challenge and checks that it was added.
 *
 * @param owner the Owner who adds it
 * @param winnieId the Winnie to add it to
 * @param body what to send, as is
 * @returns the created row
 */
export async function createChallenge(owner: SignedInOwner, winnieId: string, body: unknown): Promise<ChallengeRow> {
  const created = await postChallenge(owner, winnieId, body);
  expect(created.status).toBe(200);
  return created.json();
}

// What the Owner sees on the Winnie: the Challenges in position order.
export async function readChallenges(owner: SignedInOwner, winnieId: string): Promise<ChallengeRow[]> {
  return (await readWinnie(owner, winnieId)).challenges;
}

/**
 * Reads a Winnie as its Owner and checks the status.
 *
 * @param owner the Owner who reads it
 * @param winnieId the Winnie to read
 * @returns the Winnie with its Challenges
 */
export async function readWinnie(owner: SignedInOwner, winnieId: string): Promise<WinnieRow> {
  const response = await api(`/api/winnies/${winnieId}`, { as: owner });
  expect(response.status).toBe(200);
  return response.json();
}

/**
 * Picks a Challenge out of a read Winnie.
 *
 * @param winnie the Winnie as read
 * @param challengeId the Challenge to find
 * @returns the Challenge, or a thrown error when it is not on the Winnie
 */
export function findChallenge(winnie: WinnieRow, challengeId: string): ChallengeRow {
  const found = winnie.challenges.find(challenge => challenge.id === challengeId);
  if (!found)
    throw new Error(`Challenge ${challengeId} is not on the Winnie`);
  return found;
}

/**
 * Creates a Winnie and then its Challenges, in the given order.
 *
 * @param owner the Owner who creates them
 * @param inputs one body per Challenge; the result keeps the tuple's shape, so a test can destructure it
 * @param name the Winnie's name
 * @returns the Winnie's id and Share Link slug, and the created Challenges
 */
export async function winnieWith<const T extends readonly { game: string; spec?: string; target?: number }[]>(owner: SignedInOwner, inputs: T, name = "Test Winnie") {
  const winnie: { id: string; shareSlug: string } = await createWinnie(owner, name);

  const challenges: ChallengeRow[] = [];
  for (const input of inputs)
    challenges.push(await createChallenge(owner, winnie.id, input));
  return { winnie, challenges: challenges as { -readonly [K in keyof T]: ChallengeRow } };
}

/**
 * Starts or stops a Challenge Timer as its Owner and checks the status.
 *
 * @param owner the Owner who runs it
 * @param challengeId the Challenge whose Timer it is
 * @param action what to do
 * @returns what the endpoint answered
 */
export async function challengeTimerOk(owner: SignedInOwner, challengeId: string, action: "start" | "stop"): Promise<TimerResponse> {
  const response = await api(`/api/challenges/${challengeId}/timer`, {
    as: owner,
    method: "POST",
    json: { action },
  });
  expect(response.status).toBe(200);
  return response.json();
}

// The stop stamp is at most the serverNow of the stop response, so the accumulated time cannot
// exceed the gap between the start stamp and that serverNow (rounded up, plus the rounding of the
// server's cast). Load widens both sides alike, so no tolerance needs tuning. A wrong unit
// (milliseconds) would be thousands.
export function expectSettledSeconds(accumulated: number, startedSince: string, stopServerNow: string): void {
  expect(accumulated).toBeGreaterThanOrEqual(Math.floor(MIN_RUN_MS / 1000));
  expect(accumulated).toBeLessThanOrEqual(Math.ceil((Date.parse(stopServerNow) - Date.parse(startedSince)) / 1000) + 1);
}

// A 422 from validation: the status, the message text and the field errors, all in the body. The
// Nitro error body carries `data` intact, so a field's message can be asserted by name, and
// `statusMessage` carries the whole prettified summary, so it holds every field's message.
export async function expectValidationError(response: Response, field: string, message: string): Promise<void> {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.statusMessage).toContain(message);
  expect(body.data.fieldErrors[field]).toContain(message);
}

// An error answer: the status and the message. Returns the body for a caller that checks more of it.
export async function expectError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.statusMessage).toBe(message);
  return body as { statusMessage: string; data?: unknown };
}
