import { findChallengeWinnieId } from "~~/server/db/queries/challenge";
import { challengeBelongsTo } from "~~/server/db/queries/ownership";
import { resetChallengeTimer, startChallengeAndWinnieTimers, stopChallengeTimer } from "~~/server/db/queries/timer";
import { findWinnieWithChallenges } from "~~/server/db/queries/winnie";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: challengeId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, timerActionSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsChallenge = await challengeBelongsTo(challengeId, event.context.user.id);
  if (!ownsChallenge)
    throw createError({ statusCode: 403, statusMessage: "Not your Challenge." });

  if (requestBody.data.action === "reset") {
    const resetChallenge = await resetChallengeTimer(challengeId);

    return { changed: Boolean(resetChallenge), serverNow: await serverTimestamp() };
  }

  const winnieId = await findChallengeWinnieId(challengeId);

  if (!winnieId)
    throw createError({ statusCode: 404, statusMessage: "Challenge not found." });

  const [timerTouched] = requestBody.data.action === "start"
    ? await startChallengeAndWinnieTimers(challengeId)
    : await stopChallengeTimer(challengeId);

  return {
    changed: Boolean(timerTouched),
    winnie: await findWinnieWithChallenges(winnieId),
    serverNow: await serverTimestamp(),
  };
});
