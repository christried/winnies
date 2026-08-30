export default defineNuxtRouteMiddleware(() => {
  const user = useCurrentUser();

  if (!user.value)
    return navigateTo("/");
});
