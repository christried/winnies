import { winnieBelongsTo } from "~~/server/db/queries/ownership";
import { renameWinnie } from "~~/server/db/queries/winnie";
import { insertWinnieSchema } from "~~/server/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: winnieId } = await getValidatedRouterParams(event, idParamSchema.parse);

  const requestBody = await readValidatedBody(event, insertWinnieSchema.safeParse);

  if (!requestBody.success)
    throwValidationError(requestBody.error);

  const ownsWinnie = await winnieBelongsTo(winnieId, event.context.user.id);

  if (!ownsWinnie)
    throw createError({ statusCode: 403, statusMessage: "Not your Winnie." });

  return renameWinnie(winnieId, requestBody.data.name);
});
