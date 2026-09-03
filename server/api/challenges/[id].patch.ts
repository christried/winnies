import { updateChallenge } from "~~/server/db/queries/challenge";
import { unwinChallenge, winChallenge } from "~~/server/db/queries/completion";
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
  const updatedChallenge = result.data.status === "won"
    ? await winChallenge(id)
    : result.data.status
      ? await unwinChallenge(id)
      : await updateChallenge(id, result.data);

  if (!updatedChallenge)
    throw createError({ statusCode: 500, statusMessage: "The challenge could not be updated." });

  return updatedChallenge;
});
