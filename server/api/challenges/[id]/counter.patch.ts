import { adjustChallengeCount, setChallengeTarget } from "~~/server/db/queries/challenge";
import { winChallenge } from "~~/server/db/queries/completion";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: challengeId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, counterSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsChallenge = await challengeBelongsTo(challengeId, event.context.user.id);
  if (!ownsChallenge)
    throw createError({ statusCode: 403, statusMessage: "Not your Challenge." });

  const updatedChallenge = requestBody.data.op === "step"
    ? await adjustChallengeCount(challengeId, requestBody.data.delta)
    : await setChallengeTarget(challengeId, requestBody.data.target);

  // Reaching the target wins the challenge and may also win the Winnie in total as well.
  if (updatedChallenge?.status === "won")
    await winChallenge(challengeId);

  return updatedChallenge;
});
