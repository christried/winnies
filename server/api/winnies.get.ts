import { findWinniesByOwner } from "../db/queries/winnie";

export default defineAuthenticatedEventHandler(async (event) => {
  return findWinniesByOwner(event.context.user.id);
});
