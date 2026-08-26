import { duplicateChallenge } from "~~/server/db/queries/challenge";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: challengeId } = await getValidatedRouterParams(event, idParamSchema.parse);
  const ownerId = event.context.user.id;

  const ownsChallenge = await challengeBelongsTo(challengeId, ownerId);

  if (!ownsChallenge) {
    throw createError(
      { statusCode: 403, statusMessage: "Not your Challenge." },
    );
  }

  return duplicateChallenge(challengeId);
});
