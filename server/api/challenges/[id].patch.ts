import { updateChallenge } from "~~/server/db/queries/challenge";
import { winChallenge } from "~~/server/db/queries/completion";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse);

  const result = await readValidatedBody(event, updateChallengeSchema.safeParse);
  if (!result.success)
    throwValidationError(result.error);

  const owned = await challengeBelongsTo(id, event.context.user.id);
  if (!owned)
    throw createError({ statusCode: 403, statusMessage: "Not your challenge" });

  // Winning may complete the whole Winnie as well
  if (result.data.status === "won")
    return winChallenge(id);

  return updateChallenge(id, result.data);
});
