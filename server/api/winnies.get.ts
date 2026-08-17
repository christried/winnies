export default defineAuthenticatedEventHandler((event) => {
  return findWinniesByOwner(event.context.user.id);
});
