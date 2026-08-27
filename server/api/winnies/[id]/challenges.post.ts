import { createChallenge } from "~~/server/db/queries/challenge";
import { winnieBelongsTo } from "~~/server/db/queries/ownership";
import { assertChallengeQuota } from "~~/server/db/queries/quota";
import { insertChallengeSchema } from "~~/server/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: winnieId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, insertChallengeSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsWinnie = await winnieBelongsTo(winnieId, event.context.user.id);
  if (!ownsWinnie)
    throw createError({ statusCode: 403, statusMessage: "Not your Winnie. You cannot create a Challenge here." });

  await assertChallengeQuota(winnieId);

  return createChallenge(winnieId, requestBody.data);
});
