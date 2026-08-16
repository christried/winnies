import { useAuth } from "~/composables/use-auth";

export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuth();

  if (!session.value)
    return navigateTo("/");
});
