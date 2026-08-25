import { updateChallenge } from "~~/server/db/queries/challenge";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse);

  const result = await readValidatedBody(event, updateChallengeSchema.safeParse);

  if (!result.success)
    throwValidationError(result.error);

  const owned = await challengeBelongsTo(id, event.context.user.id);

  if (!owned)
    throw createError({ statusCode: 403, statusMessage: "Not your challenge" });

  return updateChallenge(id, result.data);
});
