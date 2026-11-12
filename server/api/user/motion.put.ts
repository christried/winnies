import { updateUserReduceMotion } from "~~/server/db/queries/user";

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, motionBodySchema.safeParse);

  if (!result.success)
    throwValidationError(result.error);

  return updateUserReduceMotion(event.context.user.id, result.data.reduceMotion);
});
