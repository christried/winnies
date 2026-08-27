import { challengeBelongsTo } from "~~/server/db/queries/ownership";
import { startChallengeAndWinnieTimers, stopChallengeTimer } from "~~/server/db/queries/timer";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: challengeId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, timerActionSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsChallenge = await challengeBelongsTo(challengeId, event.context.user.id);
  if (!ownsChallenge)
    throw createError({ statusCode: 403, statusMessage: "Not your Challenge." });

  const [timerTouched] = requestBody.data.action === "start"
    ? await startChallengeAndWinnieTimers(challengeId)
    : await stopChallengeTimer(challengeId);

  return {
    changed: Boolean(timerTouched),
    serverNow: await serverTimestamp(),
  };
});
