import { winnieBelongsTo } from "~~/server/db/queries/ownership";
import { reorderChallenges } from "~~/server/db/queries/reorder";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: winnieId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, reorderSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsWinnie = await winnieBelongsTo(winnieId, event.context.user.id);
  if (!ownsWinnie)
    throw createError({ statusCode: 403, statusMessage: "Not your Winnie." });

  const challengeIds = requestBody.data.ids;

  return reorderChallenges(winnieId, challengeIds);
});
