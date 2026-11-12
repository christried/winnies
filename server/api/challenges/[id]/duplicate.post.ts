import { duplicateChallenge, findChallengeWinnieId } from "~~/server/db/queries/challenge";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";
import { assertChallengeQuota } from "~~/server/db/queries/quota";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: challengeId } = await getValidatedRouterParams(event, idParamSchema.parse);
  const ownerId = event.context.user.id;

  const ownsChallenge = await challengeBelongsTo(challengeId, ownerId);

  if (!ownsChallenge) {
    throw createError(
      { statusCode: 403, statusMessage: "Not your Challenge." },
    );
  }

  // The copy joins the original's Winnie, so that Winnie's limit applies, as it does to adding
  const winnieId = await findChallengeWinnieId(challengeId);

  if (!winnieId)
    throw createError({ statusCode: 404, statusMessage: "Challenge not found." });

  await assertChallengeQuota(winnieId);

  return duplicateChallenge(challengeId);
});
