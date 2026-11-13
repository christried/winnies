import type { defineComponent } from "vue";
// What the Vue tests that check the server's output share: they run in `node`, where a component can be rendered to a
// string but not mounted.
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

/** Renders a component on the server, as Nuxt does for the first paint, and gives the HTML. */
export async function render(component: ReturnType<typeof defineComponent>) {
  return renderToString(createSSRApp(component));
}
