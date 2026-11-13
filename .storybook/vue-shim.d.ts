// A story imports a `.vue` file of the app, as `h(UiIcon, { name })`. `nuxt typecheck` checks the SFCs themselves; this
// project's `tsc` only needs to know what the import gives back, so the props are loose on purpose.
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, unknown>, object, unknown>;
  export default component;
}
