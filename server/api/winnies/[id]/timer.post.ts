import { winnieBelongsTo } from "~~/server/db/queries/ownership";
import { startWinnieTimer, stopWinnieTimer } from "~~/server/db/queries/timer";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: winnieId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, timerActionSchema.safeParse);
  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsWinnie = await winnieBelongsTo(winnieId, event.context.user.id);

  if (!ownsWinnie)
    throw createError({ statusCode: 403, statusMessage: "Not your Winnie." });

  const [touched] = requestBody.data.action === "start"
    ? await startWinnieTimer(winnieId)
    : await stopWinnieTimer(winnieId);

  return {
    changed: Boolean(touched),
    serverNow: await serverTimestamp(),
  };
});
