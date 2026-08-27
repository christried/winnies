// PUBLIC Route so no AuthenticatedEventHandler

import { findWinnieBySlug } from "~~/server/db/queries/winnie";

export default defineEventHandler(async (event) => {
  const { slug } = await getValidatedRouterParams(event, slugParamSchema.parse);
  const winnie = await findWinnieBySlug(slug);

  if (!winnie) {
    throw createError(
      { statusCode: 404, statusMessage: "Winnie doesn't exist." },
    );
  }

  const serverNow = await serverTimestamp();
  return { winnie, serverNow };
});
