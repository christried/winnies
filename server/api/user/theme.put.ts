import { updateUserTheme } from "~~/server/db/queries/user";

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, themeBodySchema.safeParse);

  if (!result.success)
    throwValidationError(result.error);

  return updateUserTheme(event.context.user.id, result.data.theme);
});
