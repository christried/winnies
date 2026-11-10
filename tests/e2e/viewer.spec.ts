import type { SignedInOwner } from "../support/owner";
import { TEST_SERVER_PORT } from "../support/env";
import { expect, test, visit } from "./fixtures";

// What a Viewer sees through a Share Link, pinned as the built app does it today (ADR-0001: behaviour
// stays). The Owner acts through the API with the Owner's session cookie; the default `page` is a
// signed-out browser context, which is the Viewer.

const SERVER = `http://127.0.0.1:${TEST_SERVER_PORT}`; // same address the API tests use (tests/support/test-server.ts)

const NAME = "Viewer test Winnie";
// One Challenge with a counter, one with a Win Condition and no counter, one with neither.
const CHALLENGES = [
  { game: "Speedrun", spec: "Under an hour" },
  { game: "Collect stars", spec: "All of them", target: 3 },
  { game: "No hits" },
];

// Today's cadence: app/composables/use-shared-poll.ts:3 (POLL_INTERVAL_MS = 10000). A change made after the page
// mounted is picked up by the next poll, so at most one interval later; a poll already in flight when the change
// lands can still read the old state, and then the next one follows one interval after it finished, so the worst
// case is one interval plus that request plus the next one. 5 s cover the requests and the render on a loaded
// machine, which adds well under a second to a request. Do not raise it without a run that shows a poll took
// longer, and then derive the new figure. The ticket that moves the cadence updates the constant here.
const POLL_INTERVAL_MS = 10_000;
const POLL_WAIT_MS = POLL_INTERVAL_MS + 5_000;

interface OwnerChallenge { id: string; game: string; spec: string; target: number; count: number }
interface OwnerWinnie { id: string; name: string; shareSlug: string; challenges: OwnerChallenge[] }

// The Owner's side of a test: an authenticated request, the same way tests/api/api.ts does it (which needs
// Vitest's `inject` and so cannot be imported here). Same helper as in owner-journey.spec.ts, on purpose:
// a candidate for tests/e2e/support/ once a third spec needs it.
async function ownerRequest<T>(owner: SignedInOwner, path: string, method: string, json?: unknown): Promise<T> {
  const headers = new Headers(owner.headers);
  if (json !== undefined)
    headers.set("content-type", "application/json");
  const response = await fetch(new URL(path, SERVER), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) });
  // A failed setup call must say so, instead of showing up later as a confusing missing element
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return await response.json() as T;
}

async function createWinnie(owner: SignedInOwner) {
  const winnie = await ownerRequest<{ id: string; shareSlug: string }>(owner, "/api/winnies", "POST", { name: NAME });
  const challenges: { id: string }[] = [];
  // In order: `position` follows creation order.
  for (const challenge of CHALLENGES)
    challenges.push(await ownerRequest<{ id: string }>(owner, `/api/winnies/${winnie.id}/challenges`, "POST", challenge));
  return { winnie, challenges };
}

test("a Share Link opened signed out shows the same Winnie as the Owner's", async ({ page, owner }) => {
  const { winnie } = await createWinnie(owner);
  // The expected values are the Owner's own read. This first check keeps the comparison from passing vacuously.
  const ownersView = await ownerRequest<OwnerWinnie>(owner, `/api/winnies/${winnie.id}`, "GET");
  expect(ownersView.name).toBe(NAME);
  expect(ownersView.challenges.map(challenge => challenge.game)).toEqual(CHALLENGES.map(challenge => challenge.game));

  await visit(page, `/shared/${winnie.shareSlug}`);

  await expect(page.getByText(ownersView.name, { exact: true })).toBeVisible();
  // Only the Shared View has this badge.
  await expect(page.getByText("View only")).toBeVisible();
  await expect(page.getByText(/^0 \/ 3 won/)).toBeVisible();
  // The Challenge rows are the only list items on the page.
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(ownersView.challenges.length);
  for (const [index, challenge] of ownersView.challenges.entries()) {
    const row = rows.nth(index);
    await expect(row).toContainText(challenge.game);
    if (challenge.spec)
      await expect(row).toContainText(challenge.spec);
    if (challenge.target > 0)
      await expect(row).toContainText(`${challenge.count} / ${challenge.target}`);
    else
      await expect(row).not.toContainText("/");
  }

  // The Viewer is signed out: no Workspace controls.
  await expect(page.getByRole("button", { name: "Create new Winnie" })).toHaveCount(0);
});

test("the Shared View shows a change the Owner makes within the polling cadence, without a reload", async ({ page, owner }) => {
  // Hydration, the setup calls, then up to POLL_WAIT_MS: more than the default 30 s allows for.
  test.setTimeout(60_000);
  const { winnie, challenges } = await createWinnie(owner);
  await visit(page, `/shared/${winnie.shareSlug}`);
  let navigations = 0;
  page.on("framenavigated", () => navigations++);
  // The before state, so the later text is a real change.
  await expect(page.getByText(/^0 \/ 3 won/)).toBeVisible();
  // The markup leaves one trailing space after the percent, which a regex sees, hence the `\s*`.
  const afterChange = page.getByText(/^1 \/ 3 won\D+33%\s*$/);
  await expect(afterChange).toHaveCount(0);

  // Wins "Speedrun", which has no counter. One of three leaves the Winnie not Complete, and polling stops once it is.
  await ownerRequest(owner, `/api/challenges/${challenges[0]!.id}`, "PATCH", { status: "won" });

  await expect(afterChange).toBeVisible({ timeout: POLL_WAIT_MS });
  expect(navigations).toBe(0);
  await expect(page.getByText("Win-challenge complete")).toHaveCount(0);
});

test("a deleted Winnie's Share Link shows the gone state", async ({ page, owner }) => {
  const { winnie } = await createWinnie(owner);
  await ownerRequest(owner, `/api/winnies/${winnie.id}`, "DELETE");

  await visit(page, `/shared/${winnie.shareSlug}`);

  await expect(page.getByText("This Winnie doesn't exist. Does it? Did it?")).toBeVisible();
  await expect(page.getByText("View only")).toHaveCount(0);
  await expect(page.getByText(NAME, { exact: true })).toHaveCount(0);
});

test("the Overlay of a live Winnie's Share Link loads and shows the Winnie", async ({ page, owner }) => {
  const { winnie } = await createWinnie(owner);

  await visit(page, `/shared/${winnie.shareSlug}/overlay`);

  await expect(page.getByText(NAME, { exact: true })).toBeVisible();
  for (const challenge of CHALLENGES)
    await expect(page.getByText(challenge.game, { exact: true })).toBeVisible();
  // The Counter has no spaces around the slash here, unlike the Shared View.
  await expect(page.getByText("0/3")).toBeVisible();
  // Not the Shared View, and not the gone state.
  await expect(page.getByText("View only")).toHaveCount(0);
  await expect(page.getByText("This Winnie doesn't exist (anymore).")).toHaveCount(0);
  await expect(page.getByText("This Winnie doesn't exist. Does it? Did it?")).toHaveCount(0);
});
