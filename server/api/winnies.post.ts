import { assertWinnieQuota } from "../db/queries/quota";
import { createWinnie } from "../db/queries/winnie";
import { insertWinnieSchema } from "../db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, insertWinnieSchema.safeParse);

  if (!result.success)
    throwValidationError(result.error);

  await assertWinnieQuota(event.context.user.id);

  return createWinnie({ ...result.data, ownerId: event.context.user.id });
});
