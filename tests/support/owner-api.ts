import type { APIRequestContext } from "@playwright/test";
import type { ChallengeRow, WinnieRow } from "./rows";

// The Owner's side of an e2e test: the API as that Owner, through the page's own request context. It
// carries the Owner's session cookies when it is `ownerPage.request`, and resolves a path against the
// baseURL Playwright already has, so no address is written down here.

export interface ChallengeInput {
  game: string;
  spec?: string;
  target?: number;
}

export interface SeededWinnie {
  id: string;
  shareSlug: string;
  challengeIds: string[];
}

/**
 * One authenticated call as the Owner. A failed setup call throws with its status and body, so it
 * never shows up later as a confusing missing element.
 *
 * @param request the Owner's request context, usually `ownerPage.request`
 * @param method the HTTP method
 * @param path the path on the server, such as `/api/winnies`
 * @param json a body, sent as JSON
 * @returns the parsed answer
 */
export async function ownerRequest<T = unknown>(request: APIRequestContext, method: "GET" | "POST" | "PATCH" | "DELETE", path: string, json?: unknown): Promise<T> {
  const response = await request.fetch(path, { method, data: json });
  if (!response.ok())
    throw new Error(`${method} ${path} answered ${response.status()}: ${await response.text()}`);
  return await response.json() as T;
}

/**
 * Creates a Winnie, then its Challenges in the given order, as the Owner. `position` follows creation
 * order.
 *
 * @param request the Owner's request context, usually `ownerPage.request`
 * @param input the Winnie's name and the Challenges to add to it
 * @param input.name the Winnie's name
 * @param input.challenges the Challenges, in the order they are created
 * @returns the Winnie's id and Share Link slug, and the ids of its Challenges in creation order
 */
export async function seedWinnie(request: APIRequestContext, input: { name: string; challenges?: ChallengeInput[] }): Promise<SeededWinnie> {
  const winnie = await ownerRequest<Omit<WinnieRow, "challenges">>(request, "POST", "/api/winnies", { name: input.name });
  const challengeIds: string[] = [];
  for (const challenge of input.challenges ?? [])
    challengeIds.push((await ownerRequest<ChallengeRow>(request, "POST", `/api/winnies/${winnie.id}/challenges`, challenge)).id);
  return { id: winnie.id, shareSlug: winnie.shareSlug, challengeIds };
}
