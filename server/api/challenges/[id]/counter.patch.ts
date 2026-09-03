import { adjustChallengeCount, setChallengeCounter, setChallengeTarget } from "~~/server/db/queries/challenge";
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

  let updatedChallenge = requestBody.data.op === "step"
    ? await adjustChallengeCount(challengeId, requestBody.data.delta)
    : requestBody.data.op === "set"
      ? await setChallengeCounter(challengeId, requestBody.data.count)
      : await setChallengeTarget(challengeId, requestBody.data.target);

  if (!updatedChallenge)
    throw createError({ statusCode: 500, statusMessage: "The challenge could not be updated." });

  // Reaching the target wins the challenge (and maybe the Winnie).
  if (updatedChallenge.status === "won")
    updatedChallenge = await winChallenge(challengeId) ?? updatedChallenge;

  return updatedChallenge;
});
