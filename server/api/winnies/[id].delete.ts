import { winnieBelongsTo } from "~~/server/db/queries/ownership";
import { deleteWinnie } from "~~/server/db/queries/winnie";

export default defineAuthenticatedEventHandler(async (event) => {
  const { id: winnieId } = await getValidatedRouterParams(event, idParamSchema.parse);
  const ownerId = event.context.user.id;

  const ownsWinnie = await winnieBelongsTo(winnieId, ownerId);

  if (!ownsWinnie) {
    throw createError(
      { statusCode: 403, statusMessage: "Not your Winnie." },
    );
  }

  return deleteWinnie(winnieId);
});
