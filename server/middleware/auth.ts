import { getSessionUser } from "../utils/session";

export default defineEventHandler(async (event) => {
  // appends the logged in user for all other EventHandlers
  event.context.user = await getSessionUser(event) ?? undefined;
});
